import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";
import db from "@/config/database.js";
import { APIError } from "@/utils/errors.js";

type TokenResponse = {
  access_token: string;
  bot_id?: string;
  workspace_id?: string;
  workspace_name?: string;
  owner?: any;
  token_type?: string;
};

class NotionOauthService {
  buildAuthorizeUrl(state: string): string {
    const clientId = envVars.NOTION_OAUTH_CLIENT_ID;
    const redirectUri = envVars.NOTION_OAUTH_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      throw APIError.badRequest("NOTION_OAUTH_CLIENT_ID and NOTION_OAUTH_REDIRECT_URI are required");
    }

    const url = new URL(envVars.NOTION_OAUTH_AUTHORIZE_URL || "https://api.notion.com/v1/oauth/authorize");
    url.searchParams.set("owner", "user");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const clientId = envVars.NOTION_OAUTH_CLIENT_ID;
    const clientSecret = envVars.NOTION_OAUTH_CLIENT_SECRET;
    const redirectUri = envVars.NOTION_OAUTH_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw APIError.badRequest("NOTION_OAUTH_CLIENT_ID, NOTION_OAUTH_CLIENT_SECRET, and NOTION_OAUTH_REDIRECT_URI are required");
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch(envVars.NOTION_OAUTH_TOKEN_URL || "https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type": "application/json",
        "Notion-Version": envVars.NOTION_VERSION || "2022-06-28"
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error("[Notion OAuth] Token exchange failed", { status: response.status, text });
      throw APIError.badRequest("Failed to exchange OAuth code for token");
    }

    return (await response.json()) as TokenResponse;
  }

  async storeTokenForUser(userId: string, tokens: TokenResponse): Promise<void> {
    if (!tokens.access_token) {
      throw APIError.badRequest("OAuth response missing access_token");
    }
    await db.user.update({
      where: { id: userId },
      data: {
        notionToken: tokens.access_token
      }
    });
  }

  async clearTokenForUser(userId: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: {
        notionToken: null
      }
    });
  }

  async getTokenForUser(userId: string): Promise<string | null> {
    const user = await db.user.findUnique({ where: { id: userId } });
    return user?.notionToken || null;
  }
}

export const notionOauthService = new NotionOauthService();
export default notionOauthService;
