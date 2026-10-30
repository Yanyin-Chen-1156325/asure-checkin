import "server-only";

import { serverEnvironment } from "@/lib/env/server";

export type AuthConfig = Readonly<{
  secret: string;
  sessionTtlSeconds: number;
  owner: { username: string; passwordHash: string };
  staff: { username: string; passwordHash: string };
}>;

function requireValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required authentication configuration: ${name}`);
  }
  return value;
}

function requirePasswordHash(name: string, value: string | undefined): string {
  const hash = requireValue(name, value);
  const match = /^\$2[aby]\$(\d{2})\$/.exec(hash);
  const cost = match?.[1] ? Number.parseInt(match[1], 10) : 0;
  if (!match || cost < 10 || cost > 15) {
    throw new Error(`${name} must be a bcrypt hash with a work factor from 10 to 15`);
  }
  return hash;
}

export function getAuthConfig(): AuthConfig {
  const secret = requireValue("AUTH_SECRET", serverEnvironment.AUTH_SECRET);
  if (new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 bytes");
  }

  const owner = {
    username: requireValue("OWNER_USERNAME", serverEnvironment.OWNER_USERNAME),
    passwordHash: requirePasswordHash("OWNER_PASSWORD_HASH", serverEnvironment.OWNER_PASSWORD_HASH),
  };
  const staff = {
    username: requireValue("STAFF_USERNAME", serverEnvironment.STAFF_USERNAME),
    passwordHash: requirePasswordHash("STAFF_PASSWORD_HASH", serverEnvironment.STAFF_PASSWORD_HASH),
  };
  if (owner.username === staff.username) {
    throw new Error("OWNER_USERNAME and STAFF_USERNAME must be different");
  }

  return {
    secret,
    sessionTtlSeconds: serverEnvironment.AUTH_SESSION_TTL_SECONDS,
    owner,
    staff,
  };
}
