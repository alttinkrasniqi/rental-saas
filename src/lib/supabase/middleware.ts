import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  return supabaseResponse;
}
