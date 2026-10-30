import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requirePageSession } from "@/lib/auth/current-session";

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requirePageSession();
  return <AdminShell user={{ username: session.username, role: session.role }}>{children}</AdminShell>;
}
