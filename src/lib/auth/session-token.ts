import { SignJWT, jwtVerify } from "jose";

import { roleSchema, type Role, type Session } from "./types";

const ISSUER = "asure-checkin";
const AUDIENCE = "motel-admin";
const encoder = new TextEncoder();

export async function createSessionToken(
  user: Readonly<{ username: string; role: Role }>,
  secret: string,
  ttlSeconds: number,
  now = new Date(),
): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.username)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ttlSeconds)
    .setJti(crypto.randomUUID())
    .sign(encoder.encode(secret));
}

export async function verifySessionToken(token: string, secret: string): Promise<Session | null> {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, encoder.encode(secret), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const role = roleSchema.safeParse(payload.role);
    if (protectedHeader.typ !== "JWT" || !payload.sub || !payload.iat || !payload.exp || !role.success) {
      return null;
    }
    return {
      username: payload.sub,
      role: role.data,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
    };
  } catch {
    return null;
  }
}
