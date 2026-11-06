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
        <div className="mt-9"><ButtonLink href="/login">Sign in to motel desk</ButtonLink></div>
      </section>
    </main>
  );
}
