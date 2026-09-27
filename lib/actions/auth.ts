'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ADMIN_LOGIN, loginSchema, safeAdminRedirect } from '@/lib/validation/auth';

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
  email?: string;
};

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmail = formData.get('email');
  const email = typeof rawEmail === 'string' ? rawEmail : '';
  const parsed = loginSchema.safeParse({ email: rawEmail, password: formData.get('password') });

  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { email, fieldErrors: { email: fieldErrors.email?.[0], password: fieldErrors.password?.[0] } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    // One message for unknown email and wrong password, so the form can't be
    // used to find out which emails have accounts.
    const message =
      error?.code === 'over_request_rate_limit'
        ? 'Too many attempts. Wait a few minutes and try again.'
        : 'Incorrect email or password.';
    return { email, error: message };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  if (adminError || isAdmin !== true) {
    await supabase.auth.signOut();
    return { email, error: 'This account does not have admin access.' };
  }

  redirect(safeAdminRedirect(formData.get('next')));
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(ADMIN_LOGIN);
}
