import { Request, Response } from "express";
import catchAsync from "@/handlers/async.handler.js";
import notionMcpService from "@/services/integrations/notion-mcp.service.js";
import notionService from "@/services/integrations/notion.service.js";
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
    const user = userId ? await db.user.findUnique({ where: { id: userId } }) as any : null;
    const restToken = user?.notionRestAccessToken || user?.notionToken || envVars.NOTION_API_KEY || null;
    const mcpToken = user?.notionMcpAccessToken || envVars.NOTION_MCP_TOKEN || null;

    const restStatus = {
      connected: false,
      message: 'Notion REST is not connected',
      reason: 'No REST token configured'
    } as any;

    const mcpStatus = {
      connected: false,
      message: 'Notion MCP is not connected',
      reason: 'No MCP token configured'
    } as any;

    if (restToken) {
      try {
        await notionService.getCurrentUser(restToken);
        restStatus.connected = true;
        restStatus.message = 'Notion REST is working correctly';
        restStatus.reason = null;
      } catch (restError: any) {
        restStatus.connected = false;
        restStatus.reason = restError.message || 'REST connection error';
      }
    }

    if (mcpToken) {
      try {
        await notionMcpService.search('test', mcpToken);
        mcpStatus.connected = true;
        mcpStatus.message = 'Notion MCP is working correctly';
        mcpStatus.reason = null;
      } catch (mcpError: any) {
        if (isNotionPermissionError(mcpError)) {
          mcpStatus.connected = false;
          mcpStatus.reason = 'No page access';
          mcpStatus.message = getNotionErrorMessage(mcpError);
          mcpStatus.instructions = [
            '1. Open your Notion workspace',
            '2. Navigate to Settings & Members > Connections',
            '3. Find the ORIN integration',
            '4. Share a page or database with the integration',
            '5. Try again'
          ];
        } else {
          mcpStatus.connected = false;
          mcpStatus.reason = mcpError.message || 'MCP connection error';
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        rest: restStatus,
        mcp: mcpStatus
      }
    });
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
          title: 'Choose your Notion connection method',
          description: 'ORIN supports Notion MCP (primary for agent search) and Notion REST (deterministic CRUD).',
          details: [
            'MCP: Connect via OAuth in the app to enable MCP tool calls.',
            'REST: Connect via OAuth in the app for REST API writes.'
          ]
        },
        {
          step: 2,
          title: 'Add Token to ORIN',
          description: 'For OAuth, connect in-app. For server-side MCP fallback, add NOTION_MCP_TOKEN in backend .env.',
          details: [
            'Open backend/.env',
            'Set NOTION_MCP_TOKEN=your_token_here',
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
          solution: 'For REST tokens, Notion issues "secret_" or "ntn_" formats. MCP OAuth tokens do not use these prefixes.'
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
