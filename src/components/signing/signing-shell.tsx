import type { ReactNode } from "react";

export function SigningShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="min-h-[100svh] bg-[#eef4f1] px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-8">
          <p className="font-bold text-[var(--brand-strong)]">Guest agreement</p>
          <p className="text-sm text-[var(--muted)]">Staff-assisted signing</p>
        </header>
        <div className="px-5 py-7 sm:px-10 sm:py-10">{children}</div>
      </div>
    </main>
  );
}
