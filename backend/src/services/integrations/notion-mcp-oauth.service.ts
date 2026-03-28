import crypto from "crypto";
import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";
import db from "@/config/database.js";
import { APIError } from "@/utils/errors.js";

type ProtectedResourceMetadata = {
  authorization_servers?: string[];
  authorization_server?: string;
};

export type OAuthMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  code_challenge_methods_supported?: string[];
  grant_types_supported?: string[];
  response_types_supported?: string[];
  scopes_supported?: string[];
};

type ClientCredentials = {
  client_id: string;
  client_secret?: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

class NotionMcpOauthService {
  private readonly STATE_TTL_MS = 10 * 60 * 1000;

  async discoverOAuthMetadata(mcpServerUrl: string): Promise<OAuthMetadata> {
    const baseWithSlash = mcpServerUrl.endsWith("/") ? mcpServerUrl : `${mcpServerUrl}/`;
    const baseUrl = new URL(baseWithSlash);
    const primaryUrl = new URL(".well-known/oauth-protected-resource", baseUrl);
    const fallbackUrl = new URL("/.well-known/oauth-protected-resource", baseUrl.origin);

    const fetchProtected = async (url: URL) => {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json"
        }
      });
      return response;
    };

    let protectedResponse = await fetchProtected(primaryUrl);
    if (!protectedResponse.ok) {
      logger.warn("[Notion MCP OAuth] Protected resource metadata failed", {
        status: protectedResponse.status,
        url: primaryUrl.toString()
      });
      protectedResponse = await fetchProtected(fallbackUrl);
    }

    if (!protectedResponse.ok) {
      const text = await protectedResponse.text();
      logger.error("[Notion MCP OAuth] Protected resource metadata error", {
        status: protectedResponse.status,
        body: text
      });
      throw APIError.badRequest(`Failed to fetch protected resource metadata: ${protectedResponse.status}`);
    }

    const protectedResource = (await protectedResponse.json()) as ProtectedResourceMetadata;

    const authServer =
      protectedResource.authorization_servers?.[0] || protectedResource.authorization_server;
    if (!authServer) {
      throw APIError.badRequest("OAuth discovery failed: no authorization server found");
    }

    const authMetadataUrl = new URL("/.well-known/oauth-authorization-server", authServer);
    const authResponse = await fetch(authMetadataUrl.toString());
    if (!authResponse.ok) {
      throw APIError.badRequest(`Failed to fetch authorization server metadata: ${authResponse.status}`);
    }

    const metadata = (await authResponse.json()) as OAuthMetadata;
    if (!metadata.authorization_endpoint || !metadata.token_endpoint) {
      throw APIError.badRequest("OAuth discovery failed: missing required endpoints");
    }
    return metadata;
  }

  generateCodeVerifier(): string {
    return this.base64UrlEncode(crypto.randomBytes(32));
  }

  generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash("sha256").update(verifier).digest();
    return this.base64UrlEncode(hash);
  }

  buildAuthorizationUrl(params: {
    metadata: OAuthMetadata;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
    scopes?: string[];
  }): string {
    const search = new URLSearchParams({
      response_type: "code",
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      code_challenge_method: "S256",
      state: params.state,
      prompt: "consent"
    });

    if (params.scopes && params.scopes.length > 0) {
      search.set("scope", params.scopes.join(" "));
    }

    return `${params.metadata.authorization_endpoint}?${search.toString()}`;
  }

  async registerClient(metadata: OAuthMetadata, redirectUri: string): Promise<ClientCredentials> {
    if (!metadata.registration_endpoint) {
      throw APIError.badRequest("MCP server does not support dynamic client registration");
    }

    const body = {
      client_name: "ORIN MCP Client",
      client_uri: envVars.FRONTEND_URL,
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };

    const response = await fetch(metadata.registration_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error("[Notion MCP OAuth] Client registration failed", {
        status: response.status,
        text
      });
      throw APIError.badRequest("Failed to register MCP OAuth client");
    }

    return (await response.json()) as ClientCredentials;
  }

  async exchangeCodeForToken(params: {
    metadata: OAuthMetadata;
    code: string;
    codeVerifier: string;
    clientId: string;
    redirectUri: string;
  }): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      code_verifier: params.codeVerifier
    });

    const response = await fetch(params.metadata.token_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error("[Notion MCP OAuth] Token exchange failed", {
        status: response.status,
        text
      });
      throw APIError.badRequest("Failed to exchange MCP OAuth code for token");
    }

    return (await response.json()) as TokenResponse;
  }

  async storeTokensForUser(userId: string, tokens: TokenResponse): Promise<void> {
    if (!tokens.access_token) {
      throw APIError.badRequest("OAuth response missing access_token");
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await db.user.update({
      where: { id: userId },
      data: {
        notionMcpAccessToken: tokens.access_token,
        notionMcpRefreshToken: tokens.refresh_token || null,
        notionMcpExpiresAt: expiresAt
      }
    });
  }

  async clearTokensForUser(userId: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: {
        notionMcpAccessToken: null,
        notionMcpRefreshToken: null,
        notionMcpExpiresAt: null
      }
    });
  }

  async saveOAuthState(params: {
    userId: string;
    state: string;
    codeVerifier: string;
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
  }): Promise<void> {
    await db.notionMcpOAuthState.create({
      data: {
        userId: params.userId,
        state: params.state,
        codeVerifier: params.codeVerifier,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        redirectUri: params.redirectUri,
        expiresAt: new Date(Date.now() + this.STATE_TTL_MS)
      }
    });
  }

  async getOAuthState(state: string) {
    const record = await db.notionMcpOAuthState.findUnique({ where: { state } });
    if (!record) return null;
    if (record.expiresAt.getTime() < Date.now()) {
      await db.notionMcpOAuthState.delete({ where: { state } });
      return null;
    }
    return record;
  }

  async deleteOAuthState(state: string): Promise<void> {
    await db.notionMcpOAuthState.delete({ where: { state } });
  }

  private base64UrlEncode(buffer: Buffer): string {
    return buffer
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }
}

export const notionMcpOauthService = new NotionMcpOauthService();
export default notionMcpOauthService;
