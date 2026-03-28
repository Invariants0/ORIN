import { z } from "zod";
import { NOTION_CONFIG, AI_CONFIG, SYSTEM_CONFIG } from "./constants.js";

const EnvConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8000),
  
  // Database (required)
  DATABASE_URL: z.string().optional(),
  
  // Better Auth (Required)
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().optional(),
  BETTER_AUTH_API_KEY: z.string().optional(),
  
  // Social OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().optional(),
  
  // AI Services (required for full functionality)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  
  // Notion Integration (required for full functionality)
  NOTION_OAUTH_CLIENT_ID: z.string().optional(),
  NOTION_OAUTH_CLIENT_SECRET: z.string().optional(),
  NOTION_API_KEY: z.string().optional(),
  NOTION_DATABASE_ID: z.string().optional(),
  NOTION_MCP_URL: z.string().optional(),
  NOTION_MCP_TOKEN: z.string().optional(),
  NOTION_MCP_PARENT_PAGE_ID: z.string().optional(),
  
  // Manual OAuth (optional - overrides derived values)
  NOTION_MCP_OAUTH_REDIRECT_URI: z.string().optional(),
  NOTION_OAUTH_REDIRECT_URI: z.string().optional(),
  
  // CORS
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  // Monitoring
  MONITORING_ENABLED: z.enum(["true", "false"]).optional(),
});

type EnvConfig = z.infer<typeof EnvConfigSchema> & {
  isReady: boolean;
  missingRequired: string[];
  // Derived / Constant values
  NOTION_VERSION: string;
  NOTION_OAUTH_AUTHORIZE_URL: string;
  NOTION_OAUTH_TOKEN_URL: string;
  NOTION_MCP_OAUTH_SUCCESS_REDIRECT: string;
  NOTION_OAUTH_SUCCESS_REDIRECT: string;
};

let envVars: EnvConfig;

try {
  const parsed = EnvConfigSchema.parse(process.env);
  const betterAuthUrl = parsed.BETTER_AUTH_URL || "http://localhost:8000/api/auth";
  // Robust base URL derivation (strips everything after /api if present)
  const backendBaseUrl = betterAuthUrl.split("/api")[0];
  
  // Derived Callback URLs
  const googleCallback = parsed.GOOGLE_CALLBACK_URL || `${betterAuthUrl}/callback/google`;
  const githubCallback = parsed.GITHUB_CALLBACK_URL || `${betterAuthUrl}/callback/github`;
  const mcpCallback = parsed.NOTION_MCP_OAUTH_REDIRECT_URI || `${backendBaseUrl}${NOTION_CONFIG.MCP_CALLBACK_PATH}`;
  const restCallback = parsed.NOTION_OAUTH_REDIRECT_URI || `${backendBaseUrl}${NOTION_CONFIG.REST_CALLBACK_PATH}`;

  // Check for required variables
  const missingRequired: string[] = [];
  if (!parsed.BETTER_AUTH_SECRET) missingRequired.push("BETTER_AUTH_SECRET");
  if (!parsed.GEMINI_API_KEY) missingRequired.push("GEMINI_API_KEY");
  if (!parsed.BETTER_AUTH_URL && parsed.NODE_ENV === "production") missingRequired.push("BETTER_AUTH_URL");
  
  // Final variables mapping
  const finalVars = {
    ...parsed,
    DATABASE_URL: parsed.DATABASE_URL || "file:./dev.db",
    BETTER_AUTH_URL: betterAuthUrl,
    GOOGLE_CALLBACK_URL: googleCallback,
    GITHUB_CALLBACK_URL: githubCallback,
    GEMINI_MODEL: parsed.GEMINI_MODEL || AI_CONFIG.GEMINI_MODEL_DEFAULT,
    NOTION_MCP_URL: parsed.NOTION_MCP_URL || NOTION_CONFIG.MCP_URL_DEFAULT,
    NOTION_MCP_OAUTH_REDIRECT_URI: mcpCallback,
    NOTION_MCP_OAUTH_SUCCESS_REDIRECT: parsed.FRONTEND_URL || "http://localhost:3000",
    NOTION_OAUTH_REDIRECT_URI: restCallback,
    NOTION_OAUTH_SUCCESS_REDIRECT: parsed.FRONTEND_URL || "http://localhost:3000",
    NOTION_VERSION: NOTION_CONFIG.VERSION,
    NOTION_OAUTH_AUTHORIZE_URL: NOTION_CONFIG.REST_AUTHORIZE_URL,
    NOTION_OAUTH_TOKEN_URL: NOTION_CONFIG.REST_TOKEN_URL,
    MONITORING_ENABLED: parsed.MONITORING_ENABLED || SYSTEM_CONFIG.MONITORING_DEFAULT,
    isReady: missingRequired.length === 0,
    missingRequired,
  };
  
  envVars = finalVars as EnvConfig;
  
  // Warn about missing vars in development
  if (missingRequired.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn("⚠️  Warning: Missing environment variables:", missingRequired.join(", "));
  }
  
} catch (error) {
  console.error("❌ Error loading environment variables:", error);
  process.exit(1);
}

export default envVars!;
