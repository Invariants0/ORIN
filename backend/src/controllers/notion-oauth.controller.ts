import { Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import envVars from "@/config/envVars.js";
import { APIError } from "@/utils/errors.js";
import notionOauthService from "@/services/integrations/notion-oauth.service.js";
import catchAsync from "@/handlers/async.handler.js";

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

function createState(userId: string, returnTo?: string): string {
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

function parseState(state: string): { userId: string; ts: number; returnTo?: string } {
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

const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().optional()
});

export const startNotionOAuth = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) throw APIError.unauthorized("Authentication required");

  const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : undefined;
  const safeReturnTo = returnTo && returnTo.startsWith("/") ? returnTo : undefined;
  const state = createState(userId, safeReturnTo);
  const authUrl = notionOauthService.buildAuthorizeUrl(state);
  res.status(302).redirect(authUrl);
});

export const handleNotionOAuthCallback = catchAsync(async (req: Request, res: Response) => {
  const parsed = callbackQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw APIError.badRequest("Invalid OAuth callback parameters");
  }

  const { code, state, error } = parsed.data;
  if (error) {
    throw APIError.badRequest(`OAuth error: ${error}`);
  }
  if (!code || !state) {
    throw APIError.badRequest("OAuth callback missing code or state");
  }

  const { userId, returnTo } = parseState(state);
  const tokens = await notionOauthService.exchangeCodeForToken(code);
  await notionOauthService.storeTokenForUser(userId, tokens);

  const redirectBase = envVars.NOTION_OAUTH_SUCCESS_REDIRECT || envVars.FRONTEND_URL || "http://localhost:3000";
  const path = returnTo && returnTo.startsWith("/") ? returnTo : "/settings";
  const hasQuery = path.includes("?");
  const target = `${redirectBase}${path}${hasQuery ? "&" : "?"}notion=connected`;
  res.redirect(target);
});

export const getNotionOAuthStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) throw APIError.unauthorized("Authentication required");

  const token = await notionOauthService.getTokenForUser(userId);

  res.status(200).json({
    success: true,
    data: {
      connected: Boolean(token)
    }
  });
});

export const disconnectNotionOAuth = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) throw APIError.unauthorized("Authentication required");

  await notionOauthService.clearTokenForUser(userId);

  res.status(200).json({
    success: true,
    message: "Notion connection removed"
  });
});
