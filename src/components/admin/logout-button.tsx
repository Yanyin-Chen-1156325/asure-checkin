"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: { accept: "application/json" } });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      className="min-h-11 rounded-lg border border-white/30 px-4 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-60"
      disabled={pending}
      onClick={logout}
      type="button"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
