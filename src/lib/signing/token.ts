import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

const ISSUER = "asure-checkin";
const AUDIENCE = "guest-signing";
const encoder = new TextEncoder();

const signingClaimsSchema = z.object({
  jti: z.string().uuid(),
  arrivalId: z.string().optional(),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  templatePageId: z.string().min(1),
  iat: z.number(),
  exp: z.number(),
}).strict();

export type SigningClaims = z.infer<typeof signingClaimsSchema>;

export async function createSigningToken(input: Readonly<{ signingId: string; arrivalId?: string; arrivalDate: string; templatePageId: string }>, secret: string, now = new Date()): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ arrivalId: input.arrivalId, arrivalDate: input.arrivalDate, templatePageId: input.templatePageId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuer(ISSUER).setAudience(AUDIENCE)
    .setIssuedAt(issuedAt).setExpirationTime(issuedAt + 30 * 60).setJti(input.signingId)
    .sign(encoder.encode(secret));
}

export async function verifySigningToken(token: string, secret: string): Promise<SigningClaims | null> {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, encoder.encode(secret), { algorithms: ["HS256"], issuer: ISSUER, audience: AUDIENCE });
    if (protectedHeader.typ !== "JWT") return null;
    const parsed = signingClaimsSchema.safeParse({
      jti: payload.jti,
      arrivalId: payload.arrivalId,
      arrivalDate: payload.arrivalDate,
      templatePageId: payload.templatePageId,
      iat: payload.iat,
      exp: payload.exp,
    });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
