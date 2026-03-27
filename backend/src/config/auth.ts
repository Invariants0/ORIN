import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { dash } from "@better-auth/infra";
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
    provider: "sqlite", // or "postgresql", based on schema.prisma
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-secret",
      redirectURI: process.env.GOOGLE_CALLBACK_URL,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "mock-client",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "mock-secret",
      redirectURI: process.env.GITHUB_CALLBACK_URL,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [
    dash(),
    oneTap()
  ],
});
