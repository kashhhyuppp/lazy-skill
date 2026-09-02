"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { removeSkillFromCollection } from "@/app/actions/collections";

export function CollectionItemActions({
  collectionId,
  skillId,
}: {
  collectionId: string;
  skillId: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await removeSkillFromCollection({ collectionId, skillId });
          router.refresh();
        })
      }
      aria-label="Remove from collection"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-fail/10 hover:text-fail disabled:opacity-50"
    >
      <X size={15} />
    </button>
  );
}
