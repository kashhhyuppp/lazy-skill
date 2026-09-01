import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { PairClient } from "./pair-client";

export const metadata: Metadata = {
  title: "Connect computer",
  // A pairing URL should never be indexed or previewed.
  robots: { index: false, follow: false },
};

export default async function PairPage() {
  const user = await getUser();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="font-pixel text-[17px] text-ink sm:text-[20px]">CONNECT COMPUTER</h1>
        <p className="mt-2 text-[14px] text-dim">
          Pair once. Install from your phone forever after.
        </p>
      </div>
      <PairClient signedIn={Boolean(user)} />
    </div>
  );
}
