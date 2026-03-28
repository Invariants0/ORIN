# ORIN Production Deployment Guide

This guide outlines the steps to deploy the ORIN context operating system with **Frontend on Vercel** and **Backend on Render**.

## 1. Backend Deployment (Render)

### Step A: Database Setup
Ensure you have a production-ready **Prisma-compatible** database (e.g., Supabase PostgreSQL, MongoDB Atlas, or Render Postgres).

### Step B: Environment Variables
Create a new **Web Service** on Render from your repository. Set these variables:

| Variable | Recommended Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `DATABASE_URL` | Your MongoDB/Postgres URL |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `BETTER_AUTH_SECRET` | A secure random string |
| `BETTER_AUTH_URL` | `https://your-backend.onrender.com/api/auth` |
| `GEMINI_API_KEY` | Your Google AI Studio Key |
| `NOTION_OAUTH_CLIENT_ID` | From Notion Developers Portal |
| `NOTION_OAUTH_CLIENT_SECRET` | From Notion Developers Portal |
| `NOTION_OAUTH_REDIRECT_URI` | `https://your-backend.onrender.com/api/notion/rest/callback` |
| `NOTION_MCP_OAUTH_REDIRECT_URI` | `https://your-backend.onrender.com/api/notion/mcp/callback` |

### Step C: Build Configuration
Render will automatically use the `render.yaml` and `Dockerfile` I created.
*   **Build Command**: (Handled by Docker)
*   **Start Command**: (Handled by Docker)

---

## 2. Frontend Deployment (Vercel)

### Step A: Build Settings
In your Vercel project settings:
*   **Framework Preset**: `Next.js`
*   **Install Command**: `bun install`
*   **Build Command**: `next build`

### Step B: Environment Variables
Set these in the Vercel dashboard:

| Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_FRONTEND_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://your-backend.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://your-backend.onrender.com/ws` |

---

## 3. Notion Integration Synchronization

Update your **Public Integration** in the [Notion Developer Portal](https://www.notion.so/my-integrations):
1.  **Authorization URL**: (Matches your backend URL + `/api/notion/rest/callback`)
2.  **Redirect URIs**: Ensure it includes **BOTH**:
    *   `https://your-backend.onrender.com/api/notion/rest/callback`
    *   `https://your-backend.onrender.com/api/notion/mcp/callback`

---

## 🚀 Post-Deployment Checklist
1.  **Check Logs**: Ensure the backend pod starts without `Error: Invalid GEMINI_API_KEY`.
2.  **Verify CORS**: Open your Vercel URL and check if the login button directs you correctly.
3.  **Onboarding**: Re-run the onboarding flow to verify the production Notion handshake.
