"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    // Do not log form data, tokens, or secrets. Next's digest is safe diagnostic context.
    console.error("Application error", { digest: error.digest });
  }, [error.digest]);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold tracking-widest text-[var(--danger)] uppercase">Something went wrong</p>
        <h1 className="mt-3 text-2xl font-bold">This page could not be loaded.</h1>
        <p className="mt-3 text-[var(--muted)]">Try again. If the problem continues, return the iPad to a staff member.</p>
        <button className="mt-6 min-h-12 rounded-xl bg-[var(--brand)] px-5 font-bold text-white" onClick={reset} type="button">
          Try again
        </button>
      </section>
    </main>
  );
}
