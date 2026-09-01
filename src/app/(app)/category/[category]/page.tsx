import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProviderInfo, getSkillsProvider } from "@/lib/providers";
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from "@/types/skill";
import { SkillCard } from "@/components/skills/skill-card";
import { DemoDataBanner } from "@/components/layout/data-banner";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ category: string }> };

function resolve(value: string): CategoryId | null {
  return (CATEGORY_IDS as readonly string[]).includes(value) ? (value as CategoryId) : null;
}

export function generateStaticParams() {
  return CATEGORY_IDS.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const id = resolve(category);
  if (!id) return { title: "Category not found" };
  return {
    title: `${CATEGORIES[id].label} skills`,
    description: `${CATEGORIES[id].blurb} Browse ${CATEGORIES[id].label.toLowerCase()} skills on Lazy Skill.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const id = resolve(category);
  if (!id) notFound();

  const def = CATEGORIES[id];
  const provider = getProviderInfo();

  // Categories are Lazy Skill's own taxonomy. When the active source publishes
  // no category data we say so, rather than silently listing everything under
  // whichever heading the user happened to click.
  const page = provider.capabilities.categories
    ? await getSkillsProvider().list({ category: id, view: "popular", perPage: 24 })
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
          <def.icon size={20} />
        </span>
        <div>
          <h1 className="font-pixel text-[17px] text-ink sm:text-[20px]">
            {def.label.toUpperCase()}
          </h1>
          <p className="mt-2 text-[14px] text-dim">{def.blurb}</p>
        </div>
      </div>

      {page === null ? (
        <EmptyState
          expression="annoyed"
          title="NO CATEGORIES FROM THIS SOURCE."
          body={`${provider.label} does not publish a category taxonomy, so we will not invent one. Search instead — it works.`}
          action={
            <Link href="/explore">
              <Button pixel className="text-[10px]">
                GO TO SEARCH
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {page.isDemo && <DemoDataBanner />}
          {page.skills.length === 0 ? (
            <EmptyState
              expression="idle"
              zzz
              title="NOTHING HERE YET."
              body="This shelf is empty. Check back once more skills land."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {page.skills.map((s) => (
                <SkillCard key={s.id} skill={s} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
