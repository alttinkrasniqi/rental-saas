import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the "confirm with one click" link from auth emails.
// Verifies the token, establishes the session, then forwards the user on
// (e.g. to /onboarding). Works even when the link is opened on another device.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") || "/onboarding";
  const next = nextParam.startsWith("/") ? nextParam : "/onboarding";

  const supabase = createClient();

  // Build the success destination, flagging it so the page can show the
  // "account verified" confirmation.
  const success = () => {
    const dest = new URL(next, origin);
    dest.searchParams.set("verified", "1");
    return NextResponse.redirect(dest);
  };

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return success();
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return success();
  }

  // Link invalid or already used.
  return NextResponse.redirect(new URL("/login?confirm=failed", origin));
}
