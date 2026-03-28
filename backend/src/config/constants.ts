/**
 * Application-wide constants.
 * These are values that don't need to be configurable via environment variables
 * because they are permanent or part of the internal architecture.
 */

export const AUTH_CONFIG = {
  CALLBACK_PATH_GOOGLE: "/api/auth/callback/google",
  CALLBACK_PATH_GITHUB: "/api/auth/callback/github",
};

export const NOTION_CONFIG = {
  VERSION: "2022-06-28",
  REST_AUTHORIZE_URL: "https://api.notion.com/v1/oauth/authorize",
  REST_TOKEN_URL: "https://api.notion.com/v1/oauth/token",
  MCP_URL_DEFAULT: "https://mcp.notion.com/mcp",
  MCP_CALLBACK_PATH: "/api/notion/mcp/oauth/callback",
  REST_CALLBACK_PATH: "/api/notion/oauth/callback",
};

export const AI_CONFIG = {
  GEMINI_MODEL_DEFAULT: "gemini-2.5-flash",
};

export const SYSTEM_CONFIG = {
  MONITORING_DEFAULT: "true",
};
