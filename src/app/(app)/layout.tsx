import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import { FavoritesProvider } from "@/components/skills/favorites-provider";
import { favoriteSkillIds } from "@/lib/db/favorites";
import { listDevices } from "@/lib/db/devices";
import { InstallProvider } from "@/components/install/install-provider";
import { getUser } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Seeded server-side so hearts render in the right state on first paint
  // rather than popping after hydration.
  const [user, favoriteIds] = await Promise.all([getUser(), favoriteSkillIds()]);
  const devices = user ? await listDevices() : [];

  /**
   * Connecting a computer is the whole point, and every install needs one, so
   * a signed-in account without one is sent to the connect screen and kept
   * there. Signing in is still optional — browsing without an account is
   * untouched, because someone who has not signed in has nothing to connect
   * a computer to yet.
   *
   * listDevices already excludes revoked devices, so disconnecting your last
   * computer puts you back here rather than leaving the app half-usable.
   */
  // An empty pathname means the proxy did not run, and redirecting on a value
  // we do not have would send /pair to itself forever. Failing open costs a
  // gate; failing closed costs the whole site.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const gated = user && devices.length === 0 && pathname !== "" && !pathname.startsWith("/pair");
  if (gated) redirect("/pair");

  return (
    <FavoritesProvider initialIds={favoriteIds} signedIn={Boolean(user)}>
      <InstallProvider devices={devices} signedIn={Boolean(user)}>
      <div className="relative z-10 min-h-dvh">
        <Sidebar />
        <div className="lg:pl-60">
          <TopBar
            user={
              user
                ? {
                    email: user.email ?? null,
                    name:
                      (user.user_metadata?.full_name as string | undefined) ??
                      (user.user_metadata?.user_name as string | undefined) ??
                      null,
                    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
                  }
                : null
            }
          />
          <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-6 lg:px-8 lg:pb-16">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
      </InstallProvider>
    </FavoritesProvider>
  );
}
