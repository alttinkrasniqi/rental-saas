import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE, verifyDeviceToken, sha256hex } from "@/lib/device";

// Single-domain, multi-tenant routing:
//  • PUBLIC (no login): the customer booking sites at /s/<slug>, plus /login,
//    /signup, and the root router "/".
//  • EVERYTHING ELSE: the management back-office — requires a logged-in owner.
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Supabase sometimes lands the recovery "one-click" link on the Site URL
  // ("/") with a ?code=... instead of our /auth/confirm callback (when the
  // redirect URL isn't allowlisted). Forward it to the real callback so the
  // session is established and the user reaches the new-password form.
  if (path === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    if (!url.searchParams.get("next")) url.searchParams.set("next", "/reset-password");
    return NextResponse.redirect(url);
  }

  const isPublic =
    path === "/" ||
    path === "/s" ||
    path.startsWith("/s/") ||
    path.startsWith("/auth/") ||   // email confirmation callback runs before a session exists
    path === "/login" ||
    path === "/signup" ||
    path === "/forgot-password";   // requesting a reset link needs no session

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in and trying to reach a back-office page -> login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in but sitting on an auth page -> send to the app.
  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // MFA assurance: find out whether the user has a TOTP factor enrolled and
  // whether this session has already stepped up to AAL2. Fails open (treated as
  // "no MFA") so an error never locks anyone out.
  let mfaEnrolled = false;
  let mfaSatisfied = false;
  if (user) {
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal) {
        mfaEnrolled = aal.nextLevel === "aal2";
        mfaSatisfied = aal.currentLevel === "aal2";
      }
    } catch {}
  }

  // Force the TOTP step when enrolled but not yet satisfied this session.
  if (user && !isPublic && mfaEnrolled && !mfaSatisfied && path !== "/verify-2fa") {
    const url = request.nextUrl.clone();
    url.pathname = "/verify-2fa";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // Leave the 2FA screen once satisfied (or if MFA isn't enrolled after all).
  if (user && path === "/verify-2fa" && (!mfaEnrolled || mfaSatisfied)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // New-device gate: a logged-in user on a back-office page must be on a
  // trusted device. Opt-in via DEVICE_TOKEN_SECRET; /verify-device is exempt so
  // the user can complete the email-code step. When unset, nothing is gated.
  // Skipped for MFA users — TOTP already provides the second factor.
  const deviceSecret = process.env.DEVICE_TOKEN_SECRET;

  // Trusted = valid signed cookie AND the device still has a row (so a device
  // removed in Settings loses access). Fails open only on a DB error.
  const deviceTrusted = async (): Promise<boolean> => {
    if (!deviceSecret || !user) return false;
    const token = request.cookies.get(DEVICE_COOKIE)?.value;
    if (!token || !(await verifyDeviceToken(token, user.id, deviceSecret))) return false;
    try {
      const h = await sha256hex(token);
      const { data, error } = await supabase
        .from("trusted_devices")
        .select("id")
        .eq("user_id", user.id)
        .eq("token_hash", h)
        .limit(1)
        .maybeSingle();
      if (error) return true;
      return !!data;
    } catch {
      return true;
    }
  };

  if (deviceSecret && user && !mfaEnrolled && !isPublic && path !== "/verify-device" && path !== "/verify-2fa") {
    if (!(await deviceTrusted())) {
      const url = request.nextUrl.clone();
      url.pathname = "/verify-device";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Already trusted and sitting on the verify screen -> go to the app.
  if (deviceSecret && user && !mfaEnrolled && path === "/verify-device") {
    if (await deviceTrusted()) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
