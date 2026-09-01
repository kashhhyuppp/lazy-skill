import Link from "next/link";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { listCollections } from "@/lib/db/collections";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { CollectionsManager } from "./collections-manager";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="space-y-5">
        <h1 className="font-pixel text-[17px] text-ink sm:text-[20px]">LIBRARY</h1>
        <EmptyState
          expression="waiting"
          title="SIGN IN TO BUILD COLLECTIONS."
          body="Group skills into stacks you can share."
          action={
            <Link href="/login?next=/library">
              <Button pixel className="text-[10px]">
                SIGN IN
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const collections = await listCollections();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-pixel text-[17px] text-ink sm:text-[20px]">LIBRARY</h1>
        <p className="mt-2 text-[14px] text-dim">Your collections of skills.</p>
      </div>

      {collections.length === 0 ? (
        <EmptyState
          expression="curious"
          title="YOUR SKILL PILE IS EMPTY."
          body="Start collecting."
          action={<CollectionsManager initial={[]} />}
        />
      ) : (
        <CollectionsManager initial={collections} />
      )}
    </div>
  );
}
