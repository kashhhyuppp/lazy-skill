import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import { FavoritesProvider } from "@/components/skills/favorites-provider";
import { favoriteSkillIds } from "@/lib/db/favorites";
import { listDevices } from "@/lib/db/devices";
import { InstallProvider } from "@/components/install/install-provider";
import { getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Seeded server-side so hearts render in the right state on first paint
  // rather than popping after hydration.
  const [user, favoriteIds] = await Promise.all([getUser(), favoriteSkillIds()]);
  const devices = user ? await listDevices() : [];

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
