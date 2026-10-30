import Link from "next/link";

import { ButtonLink } from "@/components/ui/button-link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
      <section className="max-w-2xl">
        <p className="mb-4 text-sm font-bold tracking-[0.18em] text-(--brand) uppercase">
          Motel operations
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Guest agreements, without the paper trail.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-(--muted)">
          A secure workspace for arrivals, agreement templates, and assisted iPad signing.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/login">Sign in</ButtonLink>
          <Link
            className="inline-flex min-h-12 items-center rounded-xl px-5 font-semibold text-(--brand) hover:bg-(--accent)"
            href="/sign/demo"
          >
            Preview signing shell
          </Link>
        </div>
      </section>
    </main>
  );
}
