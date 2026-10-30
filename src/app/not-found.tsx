import { ButtonLink } from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <section>
        <p className="font-bold text-[var(--brand)]">404</p>
        <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-[var(--muted)]">The requested page is unavailable or has expired.</p>
        <div className="mt-7"><ButtonLink href="/">Return home</ButtonLink></div>
      </section>
    </main>
  );
}
