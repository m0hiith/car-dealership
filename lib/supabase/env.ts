/**
 * Public Supabase config. Both values are designed to be public; RLS is what
 * protects the data (CLAUDE.md §5). Each variable is read by its literal name
 * so Next.js can inline it into the browser bundle.
 */
export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.',
    );
  }
  return { url, anonKey };
}
