import { Request, Response } from "express";
import catchAsync from "@/handlers/async.handler.js";
import { sendSuccess } from "@/utils/response.js";
import { APIError } from "@/utils/errors.js";
import db from "@/config/database.js";
import notionService from "@/services/integrations/notion.service.js";
import notionMcpClientService from "@/services/integrations/notion-mcp.service.js";

class NotionStatusController {
  /**
   * Comprehensive Notion Health Check (REST + MCP)
   */
  checkHealth = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = await db.user.findUnique({ where: { id: userId } });

    if (!user) throw APIError.unauthorized("User not found");

    const status: any = {
      rest: { connected: false, healthy: false },
      mcp: { connected: false, healthy: false }
    };

    // 1. Check REST Health
    if (user.notionRestAccessToken) {
      status.rest.connected = true;
      try {
        const pages = await notionService.searchPages("", user.notionRestAccessToken);
        status.rest.healthy = true;
        status.rest.pageCount = pages.length;
      } catch (e: any) {
        status.rest.error = e.message;
      }
    }

    // 2. Check MCP Health
    if (user.notionMcpAccessToken) {
      status.mcp.connected = true;
      try {
        const client = await (notionMcpClientService as any).getAuthenticatedClient(user.id);
        status.mcp.healthy = true;
        // status.mcp.capabilities = client.getServerCapabilities(); 
      } catch (e: any) {
        status.mcp.error = e.message;
      }
    }

    sendSuccess(res, status, "Notion integration health check complete");
  });

  getInstructions = catchAsync(async (req: Request, res: Response) => {
    sendSuccess(res, {
      steps: [
        "Go to Notion.so",
        "Settings & Members -> Connections",
        "Develop or Manage Integrations",
        "Ensure Internal Integration token matches NOTION_API_KEY",
        "Authorize MCP access at mcp.notion.com"
      ]
    });
  });
}

export const notionStatusController = new NotionStatusController();
