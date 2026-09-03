import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the auth session on every navigation, and decides who is allowed
 * where.
 *
 * Next 16 renamed the `middleware` convention to `proxy`; the export name and
 * filename both have to change or it silently stops running.
 */

/**
 * Browsable without an account.
 *
 * Searching is the thing people are told about, so meeting a login wall
 * before you have seen a single skill costs the visit. These pages read from
 * a public registry and a table whose policy is `using (true)`, so there is
 * nothing here to protect — the gate belongs at install, not at look.
 */
const PUBLIC_BROWSE = ["/explore", "/category", "/skills", "/leaderboard"];

/** Everything that is genuinely yours, and so needs an account. */
const PROTECTED = [
  "/home",
  "/favorites",
  "/library",
  "/profile",
  "/devices",
  "/collections",
  "/pair",
  "/p",
];

/** Matches a whole path segment, so /p never swallows /profile. */
function covers(prefix: string, path: string) {
  return path === prefix || path.startsWith(prefix + "/");
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const path = request.nextUrl.pathname;
  let response = NextResponse.next({ request });
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() revalidates the token with Supabase; getSession() would trust
  // whatever is in the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A public page is public even when signed out, and still renders normally
  // when signed in — the install button is what asks for an account.
  if (PUBLIC_BROWSE.some((prefix) => covers(prefix, path))) return response;

  const isProtected = PROTECTED.some((prefix) => covers(prefix, path));
  if (!isProtected) return response;

  /**
   * Sending the redirect from a fresh response would drop the refreshed
   * session cookies set above, signing the user out on the way to the very
   * page they were being sent to.
   */
  const goTo = (target: string) => {
    const redirect = NextResponse.redirect(new URL(target, request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!user) {
    return goTo(`/login?next=${encodeURIComponent(path + request.nextUrl.search)}`);
  }

  // The connect screen is the one protected page a signed-in account can
  // always reach, or the gate below would have nowhere to send anyone.
  if (covers("/pair", path) || covers("/p", path)) return response;

  /**
   * Connecting a computer is the whole point, and every install needs one.
   *
   * This lives here rather than in the app layout because the App Router does
   * not re-render a shared layout when navigating between its children — a
   * gate there only fires on a full page load, so every link in the app
   * walked straight past it. The proxy sees client-side navigations too.
   */
  const { count } = await supabase
    .from("devices")
    .select("id", { count: "exact", head: true })
    .is("revoked_at", null);

  if (!count) return goTo("/pair");

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
