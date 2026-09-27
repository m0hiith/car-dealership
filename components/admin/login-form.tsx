'use client';

import { useActionState } from 'react';
import { Alert, Button, Input } from '@/components/ui';
import { signIn, type LoginState } from '@/lib/actions/auth';

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  const message = state.error ?? notice;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {message && <Alert>{message}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        required
        defaultValue={state.email}
        error={state.fieldErrors?.email}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <Button type="submit" size="lg" fullWidth loading={pending} className="mt-2">
        Sign in
      </Button>
    </form>
  );
}
