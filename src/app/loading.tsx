export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center" aria-busy="true" aria-live="polite">
      <p className="text-sm font-semibold text-[var(--muted)]">Loading…</p>
    </main>
  );
}
