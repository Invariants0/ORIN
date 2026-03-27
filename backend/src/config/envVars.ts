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
  
  if (!parsed.BETTER_AUTH_SECRET) {
    missingRequired.push("BETTER_AUTH_SECRET");
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
  
  // Final variables mapping
  const finalVars = {
    ...parsed,
    DATABASE_URL: parsed.DATABASE_URL || "file:./dev.db",
    BETTER_AUTH_URL: parsed.BETTER_AUTH_URL || "http://localhost:8000/api/auth",
    GEMINI_MODEL: parsed.GEMINI_MODEL || "gemini-2.5-flash",
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
