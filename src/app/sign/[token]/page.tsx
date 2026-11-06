import { SigningShell } from "@/components/signing/signing-shell";
import { RegistrationForm } from "@/components/signing/registration-form";
import { serverEnvironment } from "@/lib/env/server";
import { getSigningOperationsRepository } from "@/lib/notion/signing-operations-repository";
import { verifySigningToken } from "@/lib/signing/token";

export default async function SigningPage({ params }: Readonly<{ params: Promise<{ token: string }> }>) {
  const { token } = await params;
  const claims = serverEnvironment.AUTH_SECRET ? await verifySigningToken(token, serverEnvironment.AUTH_SECRET) : null;
  if (!claims) return <SigningShell><h1 className="text-3xl font-bold">This signing link has expired</h1><p className="mt-4 text-[var(--muted)]">Please ask reception to start a new signing session.</p></SigningShell>;
  const operation = await getSigningOperationsRepository().get(claims.jti).catch(() => null);
  if (!operation || operation.body.snapshot.templateName.length === 0 || operation.body.snapshot.signingId !== claims.jti) return <SigningShell><h1 className="text-3xl font-bold">Signing is unavailable</h1><p className="mt-4 text-[var(--muted)]">Please return this device to reception and start a new session.</p></SigningShell>;
  if (operation.state === "completed") return <SigningShell><h1 className="text-3xl font-bold">Registration complete</h1><p className="mt-4 text-[var(--muted)]">This signing link has already been used. Please return the iPad to reception.</p></SigningShell>;
  const snapshot = operation.body.snapshot;
  return (
    <SigningShell>
      <p className="text-sm font-bold tracking-[0.15em] text-[var(--brand)] uppercase">Guest registration</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Review and sign</h1>
      <p className="mt-3 mb-8 text-[var(--muted)]">Complete the details below, review the agreement, then sign on this device.</p>
      <RegistrationForm content={snapshot.content} guest={{ name: snapshot.guest.name, email: snapshot.guest.email, phone: snapshot.guest.phone, vehicle: snapshot.guest.vehicle, walkIn: snapshot.guest.source === "walk_in" }} token={token} />
    </SigningShell>
  );
}
