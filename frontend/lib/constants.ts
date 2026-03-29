/**
 * System-wide constants and environment configuration.
 * Components should consume these rather than process.env directly.
 */

export const IS_PROD = process.env.NODE_ENV === "production";

// Primary URLs (the only ones that should be in .env)
export const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Derived API Endpoints — always use the local proxy path
export const API_BASE_URL = "/api";
export const API_VERSION = "/api/v1";
export const API_ROOT = "/api/v1";

// Better Auth
export const AUTH_URL = `${FRONTEND_URL}/api/auth`;

// WebSockets
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (
  typeof window !== "undefined" 
    ? (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host + "/ws"
    : BACKEND_URL.replace(/^http/, "ws") + "/ws"
);

export const APP_NAME = "ORIN";

export const STORAGE_KEYS = {
  AUTH_TOKEN: "orin_auth_token",
  USER_PREFERENCES: "orin_preferences",
  THEME: "orin_theme",
};

export const ROUTES = {
  HOME: "/",
  WORKFLOWS: "/workflows",
  COMMAND_CENTER: "/command-center",
  AUTONOMY: "/autonomy",
  SETTINGS: "/settings",
  AUTH: "/auth",
};

export const PROTECTED_ROUTES = [
  ROUTES.WORKFLOWS,
  ROUTES.COMMAND_CENTER,
  ROUTES.AUTONOMY,
  ROUTES.SETTINGS,
  "/dashboard", // Legacy/alias
];
