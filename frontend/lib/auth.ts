import { createAuthClient } from "better-auth/react";
import { oneTapClient } from "better-auth/client/plugins";

// Create Better Auth client connecting directly to Express backend
export const authClient = createAuthClient({
  baseURL:
    `${process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"}/api/auth`,
  plugins: [
    oneTapClient({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      autoSelect: true,
      context: "signin", // Added to satisfy new Google FedCM requirements
    })
  ]
});

export const {
  signIn,
  signUp,
  signOut,
  useSession
} = authClient;
