"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import type { FavoriteRow } from "@/lib/db/types";
import { useFavorites } from "@/components/skills/favorites-provider";
import { Panel } from "@/components/ui/panel";
import { SkillSigil } from "@/components/skills/skill-sigil";
import { relativeDate } from "@/lib/utils";

/**
 * Favorites render from the saved snapshot (name + source) rather than
 * re-fetching every skill, so the list is instant and works even if the
 * registry is down. The detail page stays the source of truth for live stats.
 */
export function FavoritesList({ rows }: { rows: FavoriteRow[] }) {
  const [query, setQuery] = React.useState("");
  const { toggle } = useFavorites();

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.skill_name.toLowerCase().includes(q) || r.skill_source.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="flex h-11 items-center rounded-xl border border-line bg-surface/80 transition-colors focus-within:border-accent">
        <Search size={16} className="ml-4 shrink-0 text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${rows.length} favorite${rows.length === 1 ? "" : "s"}...`}
          aria-label="Search favorites"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-[14px] text-ink outline-none placeholder:text-faint"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-faint">
          Nothing matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((row) => (
            <li key={row.id}>
              <Panel interactive className="flex items-center gap-3.5 p-3.5">
                <SkillSigil seed={row.skill_id} size={40} />
                <Link href={`/skills/${row.skill_id}`} className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{row.skill_name}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-faint">
                    {row.skill_source} · saved {relativeDate(row.created_at)}
                  </p>
                </Link>
                <button
                  onClick={() =>
                    toggle({ id: row.skill_id, name: row.skill_name, source: row.skill_source })
                  }
                  aria-label={`Remove ${row.skill_name} from favorites`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-fail transition-colors hover:bg-fail/10"
                >
                  <Heart size={15} fill="currentColor" />
                </button>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
