import crypto from "crypto";
import envVars from "@/config/envVars.js";
import { APIError } from "@/utils/errors.js";

const STATE_SEPARATOR = ".";
const MAX_STATE_AGE_MS = 10 * 60 * 1000;

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf-8");
}

function signState(payload: string): string {
  const secret = envVars.BETTER_AUTH_SECRET || "";
  if (!secret) {
    throw APIError.badRequest("BETTER_AUTH_SECRET is required for OAuth state signing");
  }
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createState(userId: string, returnTo?: string): string {
  const payload = JSON.stringify({
    userId,
    nonce: crypto.randomUUID(),
    ts: Date.now(),
    returnTo
  });
  const encoded = base64UrlEncode(payload);
  const signature = signState(encoded);
  return `${encoded}${STATE_SEPARATOR}${signature}`;
}

export function parseState(state: string): { userId: string; ts: number; returnTo?: string } {
  const [encoded, signature] = state.split(STATE_SEPARATOR);
  if (!encoded || !signature) {
    throw APIError.badRequest("Invalid OAuth state");
  }
  const expected = signState(encoded);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw APIError.badRequest("Invalid OAuth state signature");
  }
  const decoded = JSON.parse(base64UrlDecode(encoded)) as { userId: string; ts: number; returnTo?: string };
  if (!decoded.userId) throw APIError.badRequest("OAuth state missing userId");
  if (!decoded.ts || typeof decoded.ts !== "number") {
    throw APIError.badRequest("OAuth state missing timestamp");
  }
  if (Date.now() - decoded.ts > MAX_STATE_AGE_MS) {
    throw APIError.badRequest("OAuth state expired");
  }
  return decoded;
}
