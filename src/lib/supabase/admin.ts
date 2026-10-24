import { createClient } from "@supabase/supabase-js";

// Server-ONLY Supabase client using the service_role key. It bypasses Row Level
// Security, so it is used only in server code for the public booking pages (to
// safely read available cars and write a reservation on behalf of an anonymous
// visitor). NEVER import this into a Client Component — the key must never reach
// the browser. It is read from SUPABASE_SERVICE_ROLE_KEY (not a NEXT_PUBLIC var).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
