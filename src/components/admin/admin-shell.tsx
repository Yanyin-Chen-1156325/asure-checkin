import Link from "next/link";
import type { ReactNode } from "react";

import { LogoutButton } from "./logout-button";
import type { AuthenticatedUser } from "@/lib/auth/types";

const navigation = [
  { href: "/admin", label: "Overview", ownerOnly: false },
  { href: "/admin/arrivals", label: "Arrivals", ownerOnly: false },
  { href: "/admin/agreements", label: "Agreements", ownerOnly: true },
  { href: "/admin/records", label: "Records", ownerOnly: false },
] as const;

export function AdminShell({ children, user }: Readonly<{ children: ReactNode; user: AuthenticatedUser }>) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="border-b border-[var(--border)] bg-[var(--brand-strong)] text-white lg:min-h-screen lg:border-r lg:border-b-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:block lg:px-6 lg:py-8">
          <Link className="text-lg font-bold" href="/admin">Motel desk</Link>
          <p className="text-xs text-emerald-100 lg:mt-1">Signed in as {user.username} · {user.role}</p>
          <nav aria-label="Administration" className="hidden lg:mt-10 lg:block">
            <ul className="space-y-1">
              {navigation.filter((item) => !item.ownerOnly || user.role === "owner").map((item) => (
                <li key={item.href}>
                  <Link className="block rounded-lg px-3 py-3 font-semibold hover:bg-white/10" href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="hidden lg:mt-10 lg:block"><LogoutButton /></div>
        </div>
        <nav aria-label="Administration" className="overflow-x-auto border-t border-white/10 lg:hidden">
          <ul className="mx-auto flex max-w-7xl px-3">
            {navigation.filter((item) => !item.ownerOnly || user.role === "owner").map((item) => (
              <li key={item.href}>
                <Link className="block min-h-12 whitespace-nowrap px-3 py-3 text-sm font-semibold" href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="px-5 pb-4 lg:hidden"><LogoutButton /></div>
      </aside>
      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
    </div>
  );
}
