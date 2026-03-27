import { Request, Response } from "express";
import catchAsync from "@/handlers/async.handler.js";
import notionMcpService from "@/services/integrations/notion-mcp.service.js";
import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";
import db from "@/config/database.js";
import { isNotionPermissionError, getNotionErrorMessage } from "@/utils/notion-errors.js";

/**
 * Check Notion integration health
 */
export const checkNotionHealth = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  logger.info('[Notion Health] Checking Notion integration status', { userId });

  try {
    // Get user's token if available
    let token = envVars.NOTION_MCP_TOKEN;
    if (userId) {
      const user = await db.user.findUnique({ where: { id: userId } });
      token = user?.notionToken || token;
    }

    if (!token) {
      return res.status(200).json({
        success: true,
        data: {
          connected: false,
          reason: 'No Notion token configured',
          message: 'Please configure NOTION_MCP_TOKEN in your environment variables or connect your Notion account.',
          tokenFormat: null
        }
      });
    }

    // Check token format
    const tokenPrefix = token.substring(0, 10);
    const isValidFormat = token.startsWith('secret_') || token.startsWith('ntn_');

    if (!isValidFormat) {
      return res.status(200).json({
        success: true,
        data: {
          connected: false,
          reason: 'Invalid token format',
          message: 'Notion token should start with "secret_" or "ntn_"',
          tokenFormat: 'invalid',
          tokenPrefix: tokenPrefix + '****'
        }
      });
    }

    // Try a lightweight search to test access
    try {
      await notionMcpService.search('test', token);
      
      return res.status(200).json({
        success: true,
        data: {
          connected: true,
          message: 'Notion integration is working correctly',
          tokenFormat: token.startsWith('ntn_') ? 'new' : 'legacy',
          tokenPrefix: tokenPrefix + '****'
        }
      });

    } catch (searchError: any) {
      if (isNotionPermissionError(searchError)) {
        return res.status(200).json({
          success: true,
          data: {
            connected: false,
            reason: 'No page access',
            message: getNotionErrorMessage(searchError),
            tokenFormat: token.startsWith('ntn_') ? 'new' : 'legacy',
            tokenPrefix: tokenPrefix + '****',
            instructions: [
              '1. Open your Notion workspace',
              '2. Navigate to Settings & Members > Connections',
              '3. Find the ORIN integration',
              '4. Share a page or database with the integration',
              '5. Try again'
            ]
          }
        });
      }

      throw searchError;
    }

  } catch (error: any) {
    logger.error('[Notion Health] Health check failed', { 
      error: error.message,
      userId 
    });

    return res.status(200).json({
      success: true,
      data: {
        connected: false,
        reason: 'Connection error',
        message: error.message || 'Unable to connect to Notion',
        error: error.message
      }
    });
  }
});

/**
 * Get Notion connection instructions
 */
export const getConnectionInstructions = catchAsync(async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      title: 'How to Connect Notion to ORIN',
      steps: [
        {
          step: 1,
          title: 'Get your Notion Integration Token',
          description: 'Go to https://www.notion.so/my-integrations and create a new integration or use an existing one.',
          details: [
            'Click "New integration"',
            'Give it a name (e.g., "ORIN")',
            'Select the workspace',
            'Copy the "Internal Integration Token"'
          ]
        },
        {
          step: 2,
          title: 'Add Token to ORIN',
          description: 'Add the token to your backend .env file',
          details: [
            'Open backend/.env',
            'Set NOTION_MCP_TOKEN=your_token_here',
            'Token should start with "secret_" or "ntn_"',
            'Restart the backend server'
          ]
        },
        {
          step: 3,
          title: 'Share a Page or Database',
          description: 'Give the integration access to your Notion content',
          details: [
            'Open any Notion page or database',
            'Click "Share" in the top right',
            'Search for your integration name',
            'Click "Invite" to grant access',
            'The integration can now read and write to this page and its children'
          ]
        },
        {
          step: 4,
          title: 'Test the Connection',
          description: 'Verify everything is working',
          details: [
            'Use the health check endpoint: GET /api/integrations/notion/status',
            'Or try storing content through ORIN',
            'Check your Notion workspace for the created page'
          ]
        }
      ],
      troubleshooting: [
        {
          issue: 'Token format error',
          solution: 'Make sure your token starts with "secret_" or "ntn_". Old tokens start with "secret_", new tokens start with "ntn_".'
        },
        {
          issue: 'Permission denied / 401 error',
          solution: 'You need to share at least one page or database with the integration. Go to any Notion page, click Share, and invite your integration.'
        },
        {
          issue: 'Connection timeout',
          solution: 'Check your internet connection and verify the Notion API is accessible from your server.'
        }
      ],
      links: {
        notionIntegrations: 'https://www.notion.so/my-integrations',
        notionDocs: 'https://developers.notion.com/docs/getting-started',
        orinDocs: '/docs/notion-integration'
      }
    }
  });
});
