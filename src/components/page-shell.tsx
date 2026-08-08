import type { ReactNode } from "react";

export function PageShell({
  eyebrow,
  title,
  description,
  audience,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  audience?: string;
  phase?: string;
  children?: ReactNode;
}) {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">{title}</h1>
        <p className="mt-3 text-base text-muted-foreground">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {audience ? <Tag>Audience: {audience}</Tag> : null}
        </div>
      </div>
      <div className="mt-10">{children}</div>
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

export function ScopeList({ items }: { items: string[] }) {
  return (
    <section aria-label="Planned scope" className="surface-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Planned scope
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
