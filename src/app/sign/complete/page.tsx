import Link from "next/link";

import { SigningShell } from "@/components/signing/signing-shell";

export default function SigningCompletePage() {
  return <SigningShell>
    <div className="py-12 text-center">
      <div aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--accent)] text-3xl text-[var(--brand)]">✓</div>
      <h1 className="mt-6 text-3xl font-bold">Registration complete</h1>
      <p className="mx-auto mt-3 max-w-md text-lg leading-8 text-[var(--muted)]">The signed PDF has been saved. Please return this iPad to a staff member.</p>
      <Link className="mx-auto mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--brand)] px-6 font-bold text-white transition hover:bg-[var(--brand-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]" href="/admin">
        Back to dashboard
      </Link>
    </div>
  </SigningShell>;
}
