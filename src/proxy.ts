import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the auth session on every navigation so server components always
 * see a valid token. Without this, sessions silently expire mid-visit.
 *
 * Next 16 renamed the `middleware` convention to `proxy`; the export name and
 * filename both have to change or it silently stops running.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /**
   * Server components cannot see which path they are rendering, and the
   * onboarding gate in the app layout needs it to know whether the visitor is
   * already on the connect screen. Passing it as a request header is the only
   * way through.
   */
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers } });
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
        response = NextResponse.next({ request: { headers } });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() revalidates the token with Supabase; getSession() would trust
  // whatever is in the cookie.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
