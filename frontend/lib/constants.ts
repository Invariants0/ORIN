/**
 * System-wide constants and environment configuration.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export const API_BASE_URL = API_URL.replace(/\/v1$/, "");

export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

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
};
