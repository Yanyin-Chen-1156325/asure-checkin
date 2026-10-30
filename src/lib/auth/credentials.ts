import "server-only";

import { compare } from "bcryptjs";

import { getAuthConfig } from "./config";
import type { AuthenticatedUser } from "./types";

// A valid bcrypt hash keeps unknown-user work comparable to a real password check.
const DUMMY_PASSWORD_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5A5NYWqf3nVN4iYh1T8vN1GZV4HcGQe";

export async function verifyCredentials(username: string, password: string): Promise<AuthenticatedUser | null> {
  const config = getAuthConfig();
  const account = [config.owner, config.staff].find((candidate) => candidate.username === username);
  const passwordMatches = await compare(password, account?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!account || !passwordMatches) return null;
  return {
    username: account.username,
    role: account === config.owner ? "owner" : "staff",
  };
}
