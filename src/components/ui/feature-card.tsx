import type { ReactNode } from "react";

export function FeatureCard({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{children}</div>
    </section>
  );
}
