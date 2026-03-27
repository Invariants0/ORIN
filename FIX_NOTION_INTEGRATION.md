# Notion Integration Fix - Production Ready

## Root Cause Analysis

The ORIN system was experiencing failures when interacting with Notion MCP due to:

1. **Token Format Validation**: System only accepted legacy `secret_*` tokens, rejecting new `ntn_*` format
2. **Permission Error Handling**: 401 errors from Notion were not properly detected or handled
3. **No Fallback Mechanism**: System crashed when Notion was unavailable instead of gracefully degrading
4. **Poor Error Messages**: Users saw "No response received" instead of actionable error messages
5. **No Timeout/Retry**: Requests could hang indefinitely without retry logic
6. **Missing Health Check**: No way to verify Notion connection status

## Fixes Applied

### 1. Token Validation (envVars.ts)
- ✅ Now accepts both `secret_*` (legacy) and `ntn_*` (new) token formats
- ✅ Warns about invalid format but doesn't block execution
- ✅ Made NOTION_DATABASE_ID optional (pages created at workspace level if not set)

### 2. Error Detection & Classification (notion-errors.ts)
- ✅ Created `NotionPermissionError` class for permission issues
- ✅ Created `NotionConnectionError` class for network issues
- ✅ `isNotionPermissionError()` detects 401, "invalid_token", "permission" errors
- ✅ `getNotionErrorMessage()` provides user-friendly error messages
- ✅ `logNotionError()` logs errors with proper context and token prefix

### 3. Timeout & Retry Logic (retry.ts)
- ✅ `withTimeout()` wraps promises with 6-second timeout
- ✅ `withRetry()` implements exponential backoff (2 attempts, 1s initial delay)
- ✅ Configurable retry options per operation

### 4. Notion MCP Client Hardening (notion-mcp.client.ts)
- ✅ Wrapped `callTool()` with retry logic
- ✅ Transforms errors into appropriate types (Permission/Connection)
- ✅ Logs all errors with token prefix for debugging
- ✅ 6-second timeout per request, 2 retry attempts

### 5. Orchestrator Fallback Logic (orchestrator.service.ts)
- ✅ STORE intent now has try/catch around Notion write
- ✅ Detects permission errors and falls back to local database
- ✅ Stores content in `messages` table with fallback metadata
- ✅ Returns helpful message explaining how to connect Notion
- ✅ Never crashes - always returns a response

### 6. Chat Controller Hardening (chat.controller.ts)
- ✅ Wrapped orchestrator call in try/catch
- ✅ Always returns HTTP response (never hangs)
- ✅ Returns proper error JSON with status codes
- ✅ Logs all errors for debugging

### 7. Health Check Endpoint (notion-health.controller.ts)
- ✅ `GET /api/integrations/notion/status` - Check connection status
- ✅ `GET /api/integrations/notion/instructions` - Get setup instructions
- ✅ Validates token format
- ✅ Tests actual Notion access with lightweight search
- ✅ Returns detailed status and troubleshooting steps

### 8. Improved Logging
- ✅ All Notion operations log token prefix (first 10 chars + ****)
- ✅ Errors classified as PERMISSION, CONNECTION, or UNKNOWN
- ✅ Clear distinction between auth issues and permission issues

## How to Connect Notion Properly

### Step 1: Create Notion Integration
1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Give it a name (e.g., "ORIN")
4. Select your workspace
5. Copy the "Internal Integration Token"

### Step 2: Add Token to ORIN
1. Open `backend/.env`
2. Set `NOTION_MCP_TOKEN=your_token_here`
3. Token should start with `secret_` or `ntn_`
4. Restart backend: `cd backend && bun run dev`

### Step 3: Share a Page or Database
**This is the critical step that was missing!**

1. Open any Notion page or database
2. Click "Share" in the top right corner
3. Search for your integration name (e.g., "ORIN")
4. Click "Invite" to grant access
5. The integration can now read/write to this page and its children

### Step 4: Test Connection
```bash
# Check health status
curl http://localhost:8000/api/integrations/notion/status \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Or try storing content
curl http://localhost:8000/api/v1/message \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Store this: Test content for Notion"}'
```

## Testing Steps

### Test Case 1: Valid Token, No Page Access
**Scenario**: Token is valid but no pages shared with integration

**Expected Behavior**:
- ✅ System detects permission error
- ✅ Falls back to local storage
- ✅ Returns helpful message with instructions
- ✅ Content saved in database
- ✅ No crash

**Test**:
```bash
# Set valid token but don't share any pages
NOTION_MCP_TOKEN=ntn_valid_token_here

# Try to store content
curl -X POST http://localhost:8000/api/v1/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Store this: Test content"}'

# Should return:
# "Content saved locally... Notion integration is not connected..."
```

### Test Case 2: Valid Token, With Page Access
**Scenario**: Token is valid and pages are shared

**Expected Behavior**:
- ✅ Content created in Notion
- ✅ Returns Notion page URL
- ✅ Success message

**Test**:
```bash
# Share a page with integration first
# Then try to store content
curl -X POST http://localhost:8000/api/v1/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Store this: Test content"}'

# Should return:
# "Successfully stored... Your content has been saved to Notion."
```

### Test Case 3: Network Failure
**Scenario**: Notion API is unreachable

**Expected Behavior**:
- ✅ Timeout after 6 seconds
- ✅ Retry once with backoff
- ✅ Falls back to local storage
- ✅ Returns connection error message

**Test**:
```bash
# Simulate by blocking Notion API in firewall
# Or set invalid NOTION_MCP_URL

# Try to store content
# Should timeout and fallback gracefully
```

### Test Case 4: Invalid Token Format
**Scenario**: Token doesn't start with secret_ or ntn_

**Expected Behavior**:
- ✅ Warning logged but system continues
- ✅ Health check reports invalid format
- ✅ Helpful error message

**Test**:
```bash
# Check health endpoint
curl http://localhost:8000/api/integrations/notion/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return:
# { "connected": false, "reason": "Invalid token format" }
```

## API Endpoints

### Health Check
```
GET /api/integrations/notion/status
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "connected": true/false,
    "reason": "string",
    "message": "string",
    "tokenFormat": "new" | "legacy" | "invalid",
    "tokenPrefix": "ntn_123456****",
    "instructions": ["step 1", "step 2", ...]
  }
}
```

### Connection Instructions
```
GET /api/integrations/notion/instructions

Response:
{
  "success": true,
  "data": {
    "title": "How to Connect Notion to ORIN",
    "steps": [...],
    "troubleshooting": [...],
    "links": {...}
  }
}
```

## Troubleshooting

### Issue: "Notion integration has no access to any pages"
**Solution**: 
1. Open Notion workspace
2. Go to any page or database
3. Click "Share" → Search for your integration → Click "Invite"
4. Try again

### Issue: "Invalid token format"
**Solution**: 
- Check token starts with `secret_` or `ntn_`
- Regenerate token from https://www.notion.so/my-integrations
- Update `.env` file

### Issue: "Connection timeout"
**Solution**:
- Check internet connection
- Verify Notion API is accessible: `curl https://api.notion.com/v1/users/me`
- Check firewall settings

### Issue: "Content saved locally but not in Notion"
**Solution**:
- This is the fallback behavior when Notion is unavailable
- Check health endpoint to diagnose issue
- Fix Notion connection
- Content is safely stored in local database

## Environment Variables

```bash
# Required
NOTION_MCP_TOKEN=ntn_your_token_here  # or secret_your_token_here

# Optional
NOTION_DATABASE_ID=abc123...          # If not set, pages created at workspace level
NOTION_MCP_PARENT_PAGE_ID=xyz789...   # Alternative to database
NOTION_PROVIDER=mcp                    # or "rest"
NOTION_MCP_URL=https://mcp.notion.com/mcp  # Default
```

## Monitoring & Logs

All Notion operations are logged with:
- Token prefix (first 10 chars + ****)
- Error type (PERMISSION, CONNECTION, UNKNOWN)
- Request details (tool name, args)
- Retry attempts
- Fallback actions

Example log:
```
[Notion MCP] callTool requested { toolName: 'notion-create-pages', tokenPrefix: 'ntn_123456****' }
[Notion MCP] Retry attempt 1 { error: 'Request timeout' }
[Orchestrator] Notion permission error, falling back to local storage
```

## Production Checklist

- ✅ Token validation accepts both formats
- ✅ Permission errors detected and handled
- ✅ Fallback to local storage implemented
- ✅ Timeout and retry logic in place
- ✅ Health check endpoint available
- ✅ Error messages are user-friendly
- ✅ All responses return (no hanging)
- ✅ Comprehensive logging
- ✅ Documentation complete

## Next Steps

1. **Frontend Integration**: Update frontend to:
   - Show Notion connection status
   - Display helpful error messages
   - Link to connection instructions
   - Show when content is saved locally vs Notion

2. **User Onboarding**: Add setup wizard for Notion connection

3. **Monitoring**: Set up alerts for Notion connection failures

4. **Testing**: Add automated tests for all error scenarios

5. **Migration**: For users with local fallback data, provide tool to sync to Notion once connected
