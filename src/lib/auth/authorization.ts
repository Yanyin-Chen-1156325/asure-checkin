import type { Role } from "./types";

export function isRoleAllowed(role: Role, allowedRoles: readonly Role[]): boolean {
  return allowedRoles.includes(role);
}
