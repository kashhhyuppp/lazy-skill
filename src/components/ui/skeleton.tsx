import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg relative overflow-hidden bg-surface-2", className)}>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.055] to-transparent motion-safe:animate-[ls-sheen_1.5s_ease-in-out_infinite]" />
    </div>
  );
}
