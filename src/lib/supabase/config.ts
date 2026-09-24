/**
 * True when the Supabase environment variables are present. Used to show a
 * friendly setup message instead of crashing when the app isn't configured yet.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
