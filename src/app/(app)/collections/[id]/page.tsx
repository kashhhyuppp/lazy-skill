import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Globe, Lock } from "lucide-react";
import { getCollection } from "@/lib/db/collections";
import { getUser } from "@/lib/supabase/server";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SkillSigil } from "@/components/skills/skill-sigil";
import { EmptyState } from "@/components/feedback/empty-state";
import { CollectionItemActions } from "./item-actions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getCollection(id);
  if (!result) return { title: "Collection not found" };

  return {
    title: result.collection.name,
    description:
      result.collection.description ??
      `A collection of ${result.items.length} AI skills on Lazy Skill.`,
    // Private collections must never be indexed, even if the URL leaks.
    robots: result.collection.is_public ? undefined : { index: false, follow: false },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { id } = await params;

  // Row level security already hides collections the viewer may not see, so a
  // null result covers both "missing" and "not yours".
  const result = await getCollection(id);
  if (!result) notFound();

  const { collection, items } = result;
  const user = await getUser();
  const isOwner = user?.id === collection.user_id;

  return (
    <div className="space-y-5">
      <Link
        href="/library"
        className="inline-block font-mono text-[12px] text-faint transition-colors hover:text-accent"
      >
        ← back to library
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-bold text-ink sm:text-[26px]">{collection.name}</h1>
        <Badge tone={collection.is_public ? "accent" : "neutral"}>
          {collection.is_public ? <Globe size={11} /> : <Lock size={11} />}
          {collection.is_public ? "Shared" : "Private"}
        </Badge>
      </div>

      {collection.description && (
        <p className="max-w-2xl text-[14px] leading-relaxed text-dim">{collection.description}</p>
      )}

      {items.length === 0 ? (
        <EmptyState
          expression="idle"
          zzz
          title="EMPTY COLLECTION."
          body={
            isOwner
              ? "Add skills from any skill page with the collection button."
              : "The owner hasn't added anything yet."
          }
          action={
            isOwner ? (
              <ButtonLink href="/explore" pixel className="text-[10px]">
                  FIND SKILLS
                </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.id}>
              <Panel interactive className="flex items-center gap-3.5 p-3.5">
                <SkillSigil seed={item.skill_id} size={40} />
                <Link href={`/skills/${item.skill_id}`} className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{item.skill_name}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-faint">
                    {item.skill_source}
                  </p>
                </Link>
                {isOwner && (
                  <CollectionItemActions collectionId={collection.id} skillId={item.skill_id} />
                )}
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
