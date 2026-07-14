import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client.
 * Uses the SECRET key, so it must ONLY ever be imported from server code
 * (Server Components, route handlers, cron jobs) — never from a "use client" file.
 * The secret key bypasses row-level security, so the browser never touches the DB directly.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  // Surfaces a clear message during build/dev if env vars are missing.
  throw new Error(
    "Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY",
  );
}

export const supabaseAdmin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
