import { SigningShell } from "@/components/signing/signing-shell";

export default function SigningPage() {
  return (
    <SigningShell>
      <p className="text-sm font-bold tracking-[0.15em] text-[var(--brand)] uppercase">Responsive preview</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Welcome</h1>
      <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
        The isolated, touch-friendly signing flow will be implemented in Step 5. This shell does not resolve or expose a guest token.
      </p>
      <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 sm:p-7">
        <h2 className="text-lg font-bold">Agreement area</h2>
        <p className="mt-2 leading-7 text-[var(--muted)]">Published agreement content, contact fields, consent, and signature controls will appear here.</p>
      </section>
    </SigningShell>
  );
}
