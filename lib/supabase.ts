import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only: uses the secret key. Never import this from a client component.
export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
