import { Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import envVars from "@/config/envVars.js";
import { APIError } from "@/utils/errors.js";
import catchAsync from "@/handlers/async.handler.js";
import notionMcpOauthService from "@/services/integrations/notion-mcp-oauth.service.js";
import db from "@/config/database.js";

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

export const startNotionMcpOAuth = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) throw APIError.unauthorized("Authentication required");

  const redirectUri = envVars.NOTION_MCP_OAUTH_REDIRECT_URI;
  if (!redirectUri) {
    throw APIError.badRequest("NOTION_MCP_OAUTH_REDIRECT_URI is required");
  }

  const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : undefined;
  const safeReturnTo = returnTo && returnTo.startsWith("/") ? returnTo : undefined;

  const mcpUrl = envVars.NOTION_MCP_URL || "https://mcp.notion.com/mcp";
  const metadata = await notionMcpOauthService.discoverOAuthMetadata(mcpUrl);

  const codeVerifier = notionMcpOauthService.generateCodeVerifier();
  const codeChallenge = notionMcpOauthService.generateCodeChallenge(codeVerifier);
  const state = createState(userId, safeReturnTo);

  const client = await notionMcpOauthService.registerClient(metadata, redirectUri);

  await notionMcpOauthService.saveOAuthState({
    userId,
    state,
    codeVerifier,
    clientId: client.client_id,
    clientSecret: client.client_secret,
    redirectUri
  });

  const authUrl = notionMcpOauthService.buildAuthorizationUrl({
    metadata,
    clientId: client.client_id,
    redirectUri,
    codeChallenge,
    state
  });

  res.status(302).redirect(authUrl);
});

export const handleNotionMcpOAuthCallback = catchAsync(async (req: Request, res: Response) => {
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
  const record = await notionMcpOauthService.getOAuthState(state);
  if (!record) {
    throw APIError.badRequest("OAuth state not found or expired");
  }

  const mcpUrl = envVars.NOTION_MCP_URL || "https://mcp.notion.com/mcp";
  const metadata = await notionMcpOauthService.discoverOAuthMetadata(mcpUrl);
  const tokens = await notionMcpOauthService.exchangeCodeForToken({
    metadata,
    code,
    codeVerifier: record.codeVerifier,
    clientId: record.clientId,
    redirectUri: record.redirectUri
  });

  await notionMcpOauthService.storeTokensForUser(userId, tokens);
  await notionMcpOauthService.deleteOAuthState(state);

  const redirectBase = envVars.NOTION_MCP_OAUTH_SUCCESS_REDIRECT || envVars.FRONTEND_URL || "http://localhost:3000";
  const path = returnTo && returnTo.startsWith("/") ? returnTo : "/settings";
  const hasQuery = path.includes("?");
  const target = `${redirectBase}${path}${hasQuery ? "&" : "?"}notionMcp=connected`;
  res.redirect(target);
});

export const getNotionMcpOAuthStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) throw APIError.unauthorized("Authentication required");

  const user = await db.user.findUnique({ where: { id: userId } });

  res.status(200).json({
    success: true,
    data: {
      connected: Boolean(user?.notionMcpAccessToken)
    }
  });
});

export const disconnectNotionMcpOAuth = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) throw APIError.unauthorized("Authentication required");

  await notionMcpOauthService.clearTokensForUser(userId);

  res.status(200).json({
    success: true,
    message: "Notion MCP connection removed"
  });
});
