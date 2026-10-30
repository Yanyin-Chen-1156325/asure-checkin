import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: Readonly<{ eyebrow?: string; title: string; description: string; action?: ReactNode }>) {
  return (
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[var(--brand)] uppercase">{eyebrow}</p> : null}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl leading-7 text-[var(--muted)]">{description}</p>
      </div>
      {action}
    </header>
  );
}
