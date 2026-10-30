import type { ReactNode } from "react";

import { requirePageRole } from "@/lib/auth/current-session";

export default async function AgreementsLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requirePageRole("owner");
  return children;
}
