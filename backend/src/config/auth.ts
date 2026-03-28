import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { oneTap } from "better-auth/plugins";
import db from "./database.js";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:8000/api/auth",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:3000"],

  advanced: {
    useSecureCookies: false, // Ensure cookies are sent over HTTP on localhost
  },

  database: prismaAdapter(db, {
    provider: "postgresql", 
  }),
  user: {
    additionalFields: {
      geminiKey: {
        type: "string",
        required: false,
      },
      notionRestAccessToken: {
        type: "string",
        required: false,
      },
      notionMcpAccessToken: {
        type: "string",
        required: false,
      }
    }
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectURI: process.env.GOOGLE_CALLBACK_URL,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectURI: process.env.GITHUB_CALLBACK_URL,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [
    oneTap()
  ],
});
