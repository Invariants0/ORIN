import { Request, Response } from "express";
import { z } from "zod";
import envVars from "@/config/envVars.js";
import { APIError } from "@/utils/errors.js";
import catchAsync from "@/handlers/async.handler.js";
import { sendSuccess } from "@/utils/response.js";
import { createState, parseState } from "@/utils/oauth.js";
import notionOauthService from "@/services/integrations/notion-oauth.service.js";
import notionMcpOauthService from "@/services/integrations/notion-mcp-oauth.service.js";
import db from "@/config/database.js";

const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().optional()
});

/**
 * Unified Notion Auth Controller
 * Handles both REST (Standard Integration) and MCP (Model Context Protocol) 
 */
class NotionAuthController {
  // --- REST OAuth ---
  startRestOAuth = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : undefined;
    const safeReturnTo = returnTo && returnTo.startsWith("/") ? returnTo : undefined;

    const state = createState(userId, safeReturnTo);
    const authUrl = notionOauthService.buildAuthorizeUrl(state);
    res.redirect(authUrl);
  });

  handleRestCallback = catchAsync(async (req: Request, res: Response) => {
    const parsed = callbackQuerySchema.safeParse(req.query);
    if (!parsed.success) throw APIError.badRequest("Invalid OAuth parameters");

    const { code, state, error } = parsed.data;
    if (error) throw APIError.badRequest(`OAuth error: ${error}`);
    if (!code || !state) throw APIError.badRequest("OAuth missing code/state");

    const { userId, returnTo } = parseState(state);
    const tokens = await notionOauthService.exchangeCodeForToken(code);
    await notionOauthService.storeTokenForUser(userId, tokens);

    this.redirectSuccess(res, returnTo, "notion=connected");
  });

  // --- MCP OAuth ---
  startMcpOAuth = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const redirectUri = envVars.NOTION_MCP_OAUTH_REDIRECT_URI;
    if (!redirectUri) throw APIError.badRequest("NOTION_MCP_OAUTH_REDIRECT_URI is not configured");

    const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : undefined;
    const safeReturnTo = returnTo && returnTo.startsWith("/") ? returnTo : undefined;

    const mcpUrl = envVars.NOTION_MCP_URL || "https://mcp.notion.com/mcp";
    const metadata = await (notionMcpOauthService as any).discoverOAuthMetadata(mcpUrl);
    const client = await (notionMcpOauthService as any).registerClient(metadata, redirectUri);

    const codeVerifier = (notionMcpOauthService as any).generateCodeVerifier();
    const codeChallenge = (notionMcpOauthService as any).generateCodeChallenge(codeVerifier);
    const state = createState(userId, safeReturnTo);

    await (notionMcpOauthService as any).saveOAuthState({
      userId, state, codeVerifier, clientId: client.client_id, clientSecret: client.client_secret, redirectUri
    });

    const authUrl = (notionMcpOauthService as any).buildAuthorizationUrl({
      metadata, clientId: client.client_id, redirectUri, codeChallenge, state
    });

    res.redirect(authUrl);
  });

  handleMcpCallback = catchAsync(async (req: Request, res: Response) => {
    const parsed = callbackQuerySchema.safeParse(req.query);
    if (!parsed.success) throw APIError.badRequest("Invalid OAuth parameters");

    const { code, state, error } = parsed.data;
    if (error) throw APIError.badRequest(`OAuth error: ${error}`);
    if (!code || !state) throw APIError.badRequest("OAuth missing code/state");

    const { userId, returnTo } = parseState(state);
    const record = await (notionMcpOauthService as any).getOAuthState(state);
    if (!record) throw APIError.badRequest("OAuth state not found or expired");

    const mcpUrl = envVars.NOTION_MCP_URL || "https://mcp.notion.com/mcp";
    const metadata = await (notionMcpOauthService as any).discoverOAuthMetadata(mcpUrl);
    const tokens = await (notionMcpOauthService as any).exchangeCodeForToken({
      metadata, code, codeVerifier: record.codeVerifier, clientId: record.clientId, redirectUri: record.redirectUri
    });

    await (notionMcpOauthService as any).storeTokensForUser(userId, tokens);
    await (notionMcpOauthService as any).deleteOAuthState(state);

    this.redirectSuccess(res, returnTo, "notionMcp=connected");
  });

  // --- Shared Logic ---
  getStatus = catchAsync(async (req: Request, res: Response) => {
    const user = await db.user.findUnique({ where: { id: req.user!.id } });
    sendSuccess(res, {
      restConnected: Boolean(user?.notionRestAccessToken),
      mcpConnected: Boolean(user?.notionMcpAccessToken)
    });
  });

  disconnectAll = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    await notionOauthService.clearTokenForUser(userId);
    await (notionMcpOauthService as any).clearTokensForUser(userId);
    sendSuccess(res, null, "All Notion connections removed");
  });

  private redirectSuccess(res: Response, returnTo: string | undefined, queryParam: string) {
    const redirectBase = envVars.FRONTEND_URL || "http://localhost:3000";
    const path = returnTo && returnTo.startsWith("/") ? returnTo : "/settings";
    const separator = path.includes("?") ? "&" : "?";
    res.redirect(`${redirectBase}${path}${separator}${queryParam}`);
  }
}

export const notionAuthController = new NotionAuthController();
