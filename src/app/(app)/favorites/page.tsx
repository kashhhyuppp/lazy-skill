import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { listFavorites } from "@/lib/db/favorites";
import { EmptyState } from "@/components/feedback/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { FavoritesList } from "./favorites-list";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="space-y-5">
        <h1 className="font-pixel text-[17px] text-ink sm:text-[20px]">FAVORITES</h1>
        <EmptyState
          expression="waiting"
          title="SIGN IN TO SAVE SKILLS."
          body="Favorites follow your account, so they are there on your phone too."
          action={
            <ButtonLink href="/login?next=/favorites" pixel className="text-[10px]">
                SIGN IN
              </ButtonLink>
          }
        />
      </div>
    );
  }

  const rows = await listFavorites();

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-pixel text-[17px] text-ink sm:text-[20px]">FAVORITES</h1>
        {rows.length > 0 && (
          <span className="font-mono text-[12px] text-faint">{rows.length} saved</span>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          expression="idle"
          zzz
          title="NOTHING HERE."
          body="You haven't been lazy enough yet. Go find a skill."
          action={
            <ButtonLink href="/explore" pixel className="text-[10px]">
                EXPLORE SKILLS
              </ButtonLink>
          }
        />
      ) : (
        <FavoritesList rows={rows} />
      )}
    </div>
  );
}
