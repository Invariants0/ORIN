# Quick API Key Setup Guide

## Current Status
✅ Backend is running in development mode with dummy keys

## To Enable Full Functionality:

### 1. Get Google Gemini API Key (Required for AI features)

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key
5. In `.env`, replace `GEMINI_API_KEY=test` with your actual key

Example:
```env
GEMINI_API_KEY=AIzaSyD...your-actual-key-here
```

### 2. Get Notion API Key (Required for Notion integration)

1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Name it "ORIN"
4. Select your workspace
5. Copy the "Internal Integration Token"
6. In `.env`, replace `NOTION_API_KEY=test` with your token

Example:
```env
NOTION_API_KEY=secret_AbCdEf...your-actual-token-here
```

### 3. Get Notion Database ID

1. Create a database in Notion with these properties:
   - Title (Title type)
   - Type (Select type)
   - Tags (Multi-select type)
   - Content (Rich text type)
   - Source (URL type)

2. Share the database with your integration:
   - Click "..." on the database
   - Click "Connect to"
   - Select your "ORIN" integration

3. Copy the database ID from the URL:
   - URL format: `notion.so/your-workspace/database-id?v=...`
   - The database-id is the long string before `?v=`

4. In `.env`, replace `NOTION_DATABASE_ID=test` with your database ID

Example:
```env
NOTION_DATABASE_ID=a1b2c3d4e5f67890123456789
```

### 4. Database Setup (Optional for now)

For testing, the app will use a local PostgreSQL connection. For production:

1. Go to https://neon.tech
2. Create a free project
3. Copy the connection string
4. Replace `DATABASE_URL` in `.env`

### 5. Restart the Server

After updating `.env`:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
bun run dev
```

You should see:
```
✅ ORIN Server running on port 8000
```

## Testing

Once configured, test the endpoints:

```bash
# Health check
curl http://localhost:8000/api/health

# Store content (requires Gemini + Notion)
curl -X POST http://localhost:8000/api/v1/store \
  -H "Content-Type: application/json" \
  -d '{"input":"Test idea"}'
```

## Notes

- **Development Mode**: The app runs with dummy keys for testing
- **Production Mode**: All API keys are required
- **Security**: Never commit `.env` to Git (it's in .gitignore)

---

Need help? See GETTING_STARTED.md for detailed setup instructions.
