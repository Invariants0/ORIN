import { z } from "zod";

const EnvConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8000),
  
  // Database (required)
  DATABASE_URL: z.string().min(1).optional(),
  
  // Auth0 Configuration (optional)
  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),
  AUTH0_AUDIENCE: z.string().optional(),
  
  // Google OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  
  // AI Services (required for full functionality)
  GEMINI_API_KEY: z.string().optional(),
  
  // Notion Integration (required for full functionality)
  NOTION_API_KEY: z.string().optional(),
  NOTION_DATABASE_ID: z.string().optional(),
  
  // Security (use defaults in development)
  SESSION_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  
  // CORS
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
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
  
  if (!parsed.DATABASE_URL) {
    missingRequired.push("DATABASE_URL");
  }
  
  if (!parsed.GEMINI_API_KEY) {
    missingRequired.push("GEMINI_API_KEY");
  }
  
  if (!parsed.NOTION_API_KEY) {
    missingRequired.push("NOTION_API_KEY");
  }
  
  if (!parsed.NOTION_DATABASE_ID) {
    missingRequired.push("NOTION_DATABASE_ID");
  }
  
  // Generate defaults for secrets in development
  const finalVars = {
    ...parsed,
    DATABASE_URL: parsed.DATABASE_URL || "postgresql://localhost:5432/orin",
    GEMINI_API_KEY: parsed.GEMINI_API_KEY || "dummy-key-for-testing",
    NOTION_API_KEY: parsed.NOTION_API_KEY || "dummy-key-for-testing",
    NOTION_DATABASE_ID: parsed.NOTION_DATABASE_ID || "dummy-database-id",
    SESSION_SECRET: parsed.SESSION_SECRET || `dev-session-secret-${Date.now()}`,
    JWT_SECRET: parsed.JWT_SECRET || `dev-jwt-secret-${Date.now()}`,
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
