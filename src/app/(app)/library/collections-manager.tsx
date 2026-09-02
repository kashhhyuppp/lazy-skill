"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Lock, Plus, Trash2 } from "lucide-react";
import type { CollectionWithCount } from "@/lib/db/types";
import {
  createCollection,
  deleteCollection,
  setCollectionVisibility,
} from "@/app/actions/collections";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { relativeDate } from "@/lib/utils";

export function CollectionsManager({ initial }: { initial: CollectionWithCount[] }) {
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createCollection({ name });
    if (!result.ok) {
      setError(result.error ?? "That didn't work.");
      return;
    }
    setName("");
    setCreating(false);
    router.refresh();
  }

  function remove(collection: CollectionWithCount) {
    // Deleting takes its skills with it, so make the consequence explicit.
    const items = collection.item_count;
    const warning =
      items > 0
        ? `Delete "${collection.name}" and its ${items} skill${items === 1 ? "" : "s"}?`
        : `Delete "${collection.name}"?`;
    if (!window.confirm(warning)) return;

    startTransition(async () => {
      const result = await deleteCollection(collection.id);
      if (!result.ok) setError(result.error ?? "Could not delete that collection.");
      router.refresh();
    });
  }

  function toggleVisibility(collection: CollectionWithCount) {
    startTransition(async () => {
      await setCollectionVisibility({ id: collection.id, isPublic: !collection.is_public });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[12px] text-faint">
          {initial.length} collection{initial.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => setCreating((c) => !c)}>
          <Plus size={14} />
          New
        </Button>
      </div>

      {creating && (
        <Panel className="anim-pop p-4">
          <form onSubmit={submit} className="flex flex-col gap-2.5 sm:flex-row">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="My AI Toolkit"
              aria-label="Collection name"
              className="h-10 flex-1 rounded-lg border border-line bg-surface-2 px-3 text-[14px] text-ink outline-none placeholder:text-faint focus:border-accent"
            />
            <Button type="submit" size="md">
              Create
            </Button>
          </form>
        </Panel>
      )}

      {error && (
        <p className="rounded-lg border border-fail/35 bg-fail/10 px-3 py-2.5 text-[12px] text-fail">
          {error}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {initial.map((collection) => (
          <li key={collection.id}>
            <Panel interactive className="flex h-full flex-col p-4">
              <Link href={`/collections/${collection.id}`} className="flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">{collection.name}</p>
                <p className="mt-1 font-mono text-[11px] text-faint">
                  {collection.item_count} skill{collection.item_count === 1 ? "" : "s"} · updated{" "}
                  {relativeDate(collection.updated_at)}
                </p>
              </Link>

              <div className="mt-4 flex items-center gap-2 border-t border-line-soft pt-3">
                <button
                  onClick={() => toggleVisibility(collection)}
                  disabled={pending}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-dim transition-colors hover:bg-surface-2 hover:text-accent-hi disabled:opacity-50"
                >
                  {collection.is_public ? <Globe size={12} /> : <Lock size={12} />}
                  {collection.is_public ? "Shared" : "Private"}
                </button>
                <button
                  onClick={() => remove(collection)}
                  disabled={pending}
                  aria-label={`Delete ${collection.name}`}
                  className="ml-auto grid h-9 w-9 place-items-center rounded-md text-faint transition-colors hover:bg-fail/10 hover:text-fail disabled:opacity-50"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Just the create action, for the empty state — which already explains what
 * collections are and does not need the count or the list chrome.
 */
export function NewCollectionButton() {
  const [name, setName] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  if (!open) {
    return (
      <Button pixel className="text-[10px]" onClick={() => setOpen(true)}>
        NEW COLLECTION
      </Button>
    );
  }

  return (
    <form
      className="flex w-full max-w-xs flex-col gap-2.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const result = await createCollection({ name });
        if (!result.ok) {
          setError(result.error ?? "That didn't work.");
          return;
        }
        router.refresh();
      }}
    >
      <input
        autoFocus
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        placeholder="My AI Toolkit"
        aria-label="Collection name"
        className="h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-[14px] text-ink outline-none placeholder:text-faint focus:border-accent"
      />
      <Button type="submit" disabled={!name.trim()}>
        Create
      </Button>
      {error && <p className="text-[12px] text-fail">{error}</p>}
    </form>
  );
}
