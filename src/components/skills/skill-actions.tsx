"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, FolderPlus, Heart, Share2 } from "lucide-react";
import type { Skill } from "@/types/skill";
import type { CollectionWithCount } from "@/lib/db/types";
import { addSkillToCollection, createCollection } from "@/app/actions/collections";
import { Button } from "@/components/ui/button";
import { useFavorites } from "./favorites-provider";
import { cn } from "@/lib/utils";

/**
 * The action rail on a skill page. Favorite and collection writes require an
 * account; share works for everyone.
 */
export function SkillActions({
  skill,
  collections,
  signedIn,
}: {
  skill: Pick<Skill, "id" | "name" | "source">;
  collections: CollectionWithCount[];
  signedIn: boolean;
}) {
  const { isFavorite, toggle } = useFavorites();
  const favorited = isFavorite(skill.id);

  const [picker, setPicker] = React.useState(false);
  const [added, setAdded] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [shared, setShared] = React.useState(false);
  const router = useRouter();

  function addTo(collectionId: string) {
    startTransition(async () => {
      const result = await addSkillToCollection({
        collectionId,
        skillId: skill.id,
        skillName: skill.name,
        skillSource: skill.source,
      });
      if (result.ok) {
        setAdded(collectionId);
        router.refresh();
      }
    });
  }

  function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const created = await createCollection({ name });
      if (created.ok && created.id) {
        await addSkillToCollection({
          collectionId: created.id,
          skillId: skill.id,
          skillName: skill.name,
          skillSource: skill.source,
        });
        setNewName("");
        setAdded(created.id);
        router.refresh();
      }
    });
  }

  async function share() {
    const url = window.location.href;
    // Native share on phones, clipboard everywhere else.
    if (navigator.share) {
      try {
        await navigator.share({ title: `${skill.name} · Lazy Skill`, url });
        return;
      } catch {
        // User dismissed the sheet — fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Clipboard blocked; the URL is in the address bar regardless.
    }
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => toggle(skill)}
          aria-pressed={favorited}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          className={cn(favorited && "border-fail/45 text-fail")}
        >
          <Heart size={14} fill={favorited ? "currentColor" : "none"} />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => (signedIn ? setPicker((p) => !p) : router.push("/login"))}
          aria-expanded={picker}
          aria-label="Add to collection"
        >
          <FolderPlus size={14} />
        </Button>

        <Button variant="secondary" size="sm" onClick={share} aria-label="Share skill">
          {shared ? <Check size={14} className="text-ok" /> : <Share2 size={14} />}
        </Button>
      </div>

      {picker && (
        <div className="card-edge anim-pop absolute right-0 z-40 mt-2 w-full border border-line bg-surface p-2 shadow-2xl shadow-black/60">
          <p className="px-2 py-1.5 font-pixel text-[9px] uppercase tracking-[0.12em] text-faint">
            Add to collection
          </p>

          {collections.length > 0 && (
            <ul className="max-h-52 overflow-y-auto">
              {collections.map((c) => (
                <li key={c.id}>
                  <button
                    disabled={pending}
                    onClick={() => addTo(c.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] text-dim transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
                  >
                    <span className="flex-1 truncate">{c.name}</span>
                    {added === c.id && <Check size={13} className="text-ok" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={createAndAdd} className="mt-1 flex gap-1.5 border-t border-line-soft pt-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={60}
              placeholder="New collection..."
              aria-label="New collection name"
              className="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-2 text-[12px] text-ink outline-none placeholder:text-faint focus:border-accent"
            />
            <Button type="submit" size="sm" disabled={pending || !newName.trim()}>
              Add
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
