import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { listCollections } from "@/lib/db/collections";
import { listInstallations } from "@/lib/db/installations";
import { InstallHistory } from "./install-history";
import { EmptyState } from "@/components/feedback/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { CollectionsManager, NewCollectionButton } from "./collections-manager";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="space-y-5">
        <h1 className="font-pixel text-[17px] text-ink sm:text-[20px]">LIBRARY</h1>
        <EmptyState
          title="SIGN IN TO BUILD COLLECTIONS."
          body="Group skills into stacks you can share."
          action={
            <ButtonLink href="/login?next=/library" pixel className="text-[10px]">
                SIGN IN
              </ButtonLink>
          }
        />
      </div>
    );
  }

  const [collections, installs] = await Promise.all([
    listCollections(),
    listInstallations(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-pixel text-[17px] text-ink sm:text-[20px]">LIBRARY</h1>
        <p className="mt-2 text-[14px] text-dim">Your collections of skills.</p>
      </div>

      {/* The manager renders its own count and New button, so embedding it
          inside the empty state produced "0 collections" next to a button
          inside a card that already said the same thing. */}
      {collections.length === 0 ? (
        <EmptyState
          title="YOUR SKILL PILE IS EMPTY."
          body="Group skills into stacks you can share."
          action={<NewCollectionButton />}
        />
      ) : (
        <CollectionsManager initial={collections} />
      )}

      <InstallHistory rows={installs} />
    </div>
  );
}
