/** Shared bits so the two documents read identically. */

export function DocTitle({ title, updated }: { title: string; updated: string }) {
  return (
    <div className="mb-10">
      <h1 className="font-pixel text-[17px] leading-relaxed text-ink sm:text-[20px]">{title}</h1>
      <p className="mt-3 font-mono text-[11px] text-faint">Last updated {updated}</p>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-pixel text-[12px] leading-relaxed text-ink sm:text-[13px]">{heading}</h2>
      <div className="mt-4 space-y-3.5 text-[14px] leading-relaxed text-dim">{children}</div>
    </section>
  );
}

export function Rows({ items }: { items: [string, string][] }) {
  return (
    <dl className="mt-4 divide-y divide-line/60 border-y border-line/60">
      {items.map(([term, detail]) => (
        <div key={term} className="grid gap-1 py-3 sm:grid-cols-[13rem_1fr] sm:gap-5">
          <dt className="font-mono text-[12px] text-ink">{term}</dt>
          <dd className="text-[14px] leading-relaxed text-dim">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
