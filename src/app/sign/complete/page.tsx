import { SigningShell } from "@/components/signing/signing-shell";

export default function SigningCompletePage() {
  return (
    <SigningShell>
      <div className="py-12 text-center">
        <div aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--accent)] text-3xl text-[var(--brand)]">✓</div>
        <h1 className="mt-6 text-3xl font-bold">Agreement complete</h1>
        <p className="mx-auto mt-3 max-w-md text-lg leading-8 text-[var(--muted)]">Please return this iPad to a staff member.</p>
      </div>
    </SigningShell>
  );
}
