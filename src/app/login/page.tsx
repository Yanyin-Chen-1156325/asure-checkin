import type { Route } from "next";

import { PageHeading } from "@/components/ui/page-heading";
import { LoginForm } from "@/components/auth/login-form";

function safeReturnTo(value: string | string[] | undefined): Route {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/admin") && !candidate.startsWith("//") ? candidate as Route : "/admin";
}

export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ next?: string | string[] }> }>) {
  const returnTo = safeReturnTo((await searchParams).next);
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-(--border) bg-white p-7 shadow-sm sm:p-10">
        <PageHeading eyebrow="Motel desk" title="Sign in" description="Use the fixed owner or staff credentials supplied by the motel operator." />
        <LoginForm returnTo={returnTo} />
      </section>
    </main>
  );
}

