"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryButton({ recordId }: Readonly<{ recordId: string }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function retry() {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/records/${encodeURIComponent(recordId)}/retry`, { method: "POST", headers: { accept: "application/json" } });
      const body = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Recovery failed.");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Recovery failed."); }
    finally { setPending(false); }
  }
  return <div><button className="min-h-12 rounded-xl border border-[var(--danger)] px-5 font-bold text-[var(--danger)] disabled:opacity-60" disabled={pending} onClick={() => void retry()} type="button">{pending ? "Retrying…" : "Retry signing workflow"}</button>{error ? <p className="mt-2 text-sm text-[var(--danger)]" role="alert">{error}</p> : null}</div>;
}
