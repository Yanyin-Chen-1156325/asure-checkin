"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type LoginError = { message?: string };

export function LoginForm({ returnTo = "/admin" }: Readonly<{ returnTo?: Route }>) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ username: formData.get("username"), password: formData.get("password") }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as LoginError;
        setError(body.message ?? "Sign in failed. Please try again.");
        return;
      }
      router.replace(returnTo);
      router.refresh();
    } catch {
      setError("Sign in is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <div>
        <label className="mb-2 block text-sm font-bold" htmlFor="username">Username</label>
        <input
          autoComplete="username"
          autoFocus
          className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-base"
          disabled={pending}
          id="username"
          maxLength={128}
          name="username"
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-bold" htmlFor="password">Password</label>
        <input
          autoComplete="current-password"
          className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-base"
          disabled={pending}
          id="password"
          maxLength={1024}
          name="password"
          required
          type="password"
        />
      </div>
      {error ? <p aria-live="polite" className="rounded-xl bg-red-50 p-3 text-sm text-[var(--danger)]">{error}</p> : null}
      <button className="min-h-12 w-full rounded-xl bg-[var(--brand)] px-5 font-bold text-white hover:bg-[var(--brand-strong)] disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
