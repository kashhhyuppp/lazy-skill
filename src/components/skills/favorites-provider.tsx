"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/app/actions/favorites";
import type { Skill } from "@/types/skill";

interface FavoritesContextValue {
  isFavorite: (skillId: string) => boolean;
  toggle: (skill: Pick<Skill, "id" | "name" | "source">) => void;
  signedIn: boolean;
}

const FavoritesContext = React.createContext<FavoritesContextValue | null>(null);

/**
 * Holds the signed-in user's favorite ids, seeded on the server so buttons
 * render in the right state on first paint.
 *
 * Toggles apply optimistically and roll back if the write fails — a heart that
 * lies about being saved is worse than a slow one.
 */
export function FavoritesProvider({
  initialIds,
  signedIn,
  children,
}: {
  initialIds: string[];
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const [ids, setIds] = React.useState<Set<string>>(() => new Set(initialIds));
  const router = useRouter();

  const isFavorite = React.useCallback((skillId: string) => ids.has(skillId), [ids]);

  const toggle = React.useCallback(
    (skill: Pick<Skill, "id" | "name" | "source">) => {
      if (!signedIn) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      const wasFavorite = ids.has(skill.id);
      setIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(skill.id);
        else next.add(skill.id);
        return next;
      });

      void toggleFavorite({
        skillId: skill.id,
        skillName: skill.name,
        skillSource: skill.source,
        favorited: wasFavorite,
      }).then((result) => {
        if (result.ok) return;
        setIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(skill.id);
          else next.delete(skill.id);
          return next;
        });
      });
    },
    [ids, router, signedIn]
  );

  const value = React.useMemo(
    () => ({ isFavorite, toggle, signedIn }),
    [isFavorite, toggle, signedIn]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

/**
 * Returns null outside a provider so cards can render in isolation — a story,
 * a test, or a page that has no account context — without throwing.
 */
export function useFavorites(): FavoritesContextValue {
  return (
    React.useContext(FavoritesContext) ?? {
      isFavorite: () => false,
      toggle: () => {},
      signedIn: false,
    }
  );
}
