import { z } from "zod";

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
  NOTION_API_KEY: z.string().optional(),
  NOTION_DATABASE_ID: z.string().optional(),
  NOTION_PROVIDER: z.enum(["mcp", "rest"]).optional(),
  NOTION_MCP_URL: z.string().optional(),
  NOTION_MCP_TOKEN: z.string().optional(),
  NOTION_MCP_PARENT_PAGE_ID: z.string().optional(),
  NOTION_MCP_OAUTH_REDIRECT_URI: z.string().optional(),
  NOTION_MCP_OAUTH_SUCCESS_REDIRECT: z.string().optional(),
  NOTION_OAUTH_CLIENT_ID: z.string().optional(),
  NOTION_OAUTH_CLIENT_SECRET: z.string().optional(),
  NOTION_OAUTH_REDIRECT_URI: z.string().optional(),
  NOTION_OAUTH_AUTHORIZE_URL: z.string().optional(),
  NOTION_OAUTH_TOKEN_URL: z.string().optional(),
  NOTION_OAUTH_SUCCESS_REDIRECT: z.string().optional(),
  NOTION_VERSION: z.string().optional(),
  
  // Security (use defaults in development)
  SESSION_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  
  // CORS
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  // Monitoring
  MONITORING_ENABLED: z.enum(["true", "false"]).optional(),
});

type EnvConfig = z.infer<typeof EnvConfigSchema> & {
  isReady: boolean;
  missingRequired: string[];
};

let envVars: EnvConfig;

try {
  const parsed = EnvConfigSchema.parse(process.env);
  
  // Check for required variables
  const missingRequired: string[] = [];
  
  if (!parsed.BETTER_AUTH_SECRET) {
    missingRequired.push("BETTER_AUTH_SECRET");
  }
  
  if (!parsed.GEMINI_API_KEY) {
    missingRequired.push("GEMINI_API_KEY");
  }
  
  const notionProvider = parsed.NOTION_PROVIDER || "mcp";
  if (notionProvider === "rest" && !parsed.NOTION_API_KEY) {
    missingRequired.push("NOTION_API_KEY");
  }

  // Accept both legacy (secret_) and new (ntn_) token formats for server-level MCP usage
  if (parsed.NOTION_MCP_TOKEN) {
    const token = parsed.NOTION_MCP_TOKEN;
    if (!token.startsWith("secret_") && !token.startsWith("ntn_")) {
      console.warn("⚠️  Warning: NOTION_MCP_TOKEN format may be invalid. Expected format: 'secret_*' or 'ntn_*'");
    }
  } else if (notionProvider === "mcp") {
    console.warn("⚠️  Warning: NOTION_MCP_TOKEN not set. MCP calls will require user OAuth tokens.");
  }

  // NOTION_DATABASE_ID is optional - system will work without it
  if (!parsed.NOTION_DATABASE_ID) {
    console.warn("⚠️  Warning: NOTION_DATABASE_ID not set. Pages will be created at workspace level.");
  }

  if (!parsed.NOTION_MCP_OAUTH_REDIRECT_URI) {
    console.warn("⚠️  Warning: NOTION_MCP_OAUTH_REDIRECT_URI not set. MCP OAuth flow will not work.");
  }
  
  // Final variables mapping
  const finalVars = {
    ...parsed,
    DATABASE_URL: parsed.DATABASE_URL || "file:./dev.db",
    BETTER_AUTH_URL: parsed.BETTER_AUTH_URL || "http://localhost:8000/api/auth",
    GEMINI_MODEL: parsed.GEMINI_MODEL || "gemini-2.5-flash",
    NOTION_PROVIDER: notionProvider,
    NOTION_MCP_URL: parsed.NOTION_MCP_URL || "https://mcp.notion.com/mcp",
    NOTION_MCP_OAUTH_SUCCESS_REDIRECT: parsed.NOTION_MCP_OAUTH_SUCCESS_REDIRECT || parsed.FRONTEND_URL || "http://localhost:3000",
    MONITORING_ENABLED: parsed.MONITORING_ENABLED || "true",
    isReady: missingRequired.length === 0,
    missingRequired,
  };
  
  envVars = finalVars as EnvConfig;
  
  // Warn about missing vars in development
  if (missingRequired.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn("⚠️  Warning: Missing environment variables:");
    console.warn(missingRequired.join(", "));
    console.warn("\nSome features may not work. See .env.example for details.");
    console.warn("\n📝 Quick setup:\n   cp .env.example .env\n   Edit .env and add your API keys\n");
  }
  
} catch (error) {
  console.error("❌ Error loading environment variables:", error);
  process.exit(1);
}

export default envVars!;
