"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/search/search-bar";
import { pushRecent } from "@/lib/recent-searches";

/** The hero search. Submitting hands off to Explore, which owns results. */
export function HomeSearch() {
  const [q, setQ] = React.useState("");
  const router = useRouter();

  return (
    <SearchBar
      value={q}
      onChange={setQ}
      onSubmit={(term) => {
        const clean = term.trim();
        if (!clean) return;
        pushRecent(clean);
        router.push(`/explore?q=${encodeURIComponent(clean)}`);
      }}
      size="lg"
    />
  );
}
