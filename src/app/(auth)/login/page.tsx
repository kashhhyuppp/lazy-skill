import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getUser()) redirect("/home");

  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 transition-opacity hover:opacity-80">
        <Logo size={28} />
      </Link>
      <div className="w-full max-w-sm">
        <Suspense fallback={<Skeleton className="h-[420px]" />}>
          <LoginForm configured={supabaseConfig().isConfigured} />
        </Suspense>
      </div>
      <Link
        href="/explore"
        className="mt-8 font-mono text-[12px] text-faint transition-colors hover:text-accent"
      >
        or just browse without an account
      </Link>
    </main>
  );
}
