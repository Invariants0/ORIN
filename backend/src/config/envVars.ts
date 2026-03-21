import { z } from "zod";

const EnvConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  
  // Auth0 Configuration (optional for now)
  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),
  AUTH0_AUDIENCE: z.string().optional(),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  
  // AI Services
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  
  // Notion Integration
  NOTION_API_KEY: z.string().min(1, "NOTION_API_KEY is required"),
  NOTION_DATABASE_ID: z.string().min(1, "NOTION_DATABASE_ID is required"),
  
  // Security
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  
  // CORS
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
});

type EnvConfig = z.infer<typeof EnvConfigSchema>;

let envVars: EnvConfig;

try {
  envVars = EnvConfigSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingVars = error.errors
      .filter((err) => err.code === "invalid_type")
      .map((err) => err.path.join("."));
    
    console.error("❌ Missing or invalid environment variables:");
    console.error(missingVars.join(", "));
    console.error("\nPlease copy .env.example to .env and fill in the values.");
    process.exit(1);
  }
}

export default envVars!;
