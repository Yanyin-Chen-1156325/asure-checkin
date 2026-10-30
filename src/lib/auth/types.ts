import { z } from "zod";

export const roleSchema = z.enum(["owner", "staff"]);
export type Role = z.infer<typeof roleSchema>;

export type Session = Readonly<{
  username: string;
  role: Role;
  issuedAt: number;
  expiresAt: number;
}>;

export type AuthenticatedUser = Readonly<Pick<Session, "username" | "role">>;
