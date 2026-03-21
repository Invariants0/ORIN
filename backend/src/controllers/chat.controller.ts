import { Request, Response } from "express";
import catchAsync from "@/handlers/async.handler.js";
import { APIError } from "@/utils/errors.js";
import geminiService from "@/services/gemini.service.js";
import notionService from "@/services/notion.service.js";
import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";

export const store = catchAsync(async (req: Request, res: Response) => {
  const { input } = req.body;

  if (!input) {
    throw APIError.badRequest("Input is required");
  }

  // Classify content using Gemini
  const classification = await geminiService.classifyContent(input);

  // Create Notion page in Inbox database
  const page = await notionService.createPage({
    parent: { database_id: envVars.NOTION_DATABASE_ID },
    properties: {
      Title: {
        title: [
          {
            text: {
              content: classification.title,
            },
          },
        ],
      },
      Type: {
        select: {
          name: classification.type,
        },
      },
      Tags: {
        multi_select: classification.tags.map((tag) => ({ name: tag })),
      },
      Content: {
        rich_text: [
          {
            text: {
              content: classification.summary,
            },
          },
        ],
      },
      Source: {
        url: typeof input === "string" ? null : input.url || null,
      },
    },
  });

  logger.info(`[Store] Stored content in Notion: ${page.id}`);

  res.status(201).json({
    status: "success",
    data: {
      id: page.id,
      url: page.url,
      classification,
    },
  });
});

export const retrieve = catchAsync(async (req: Request, res: Response) => {
  const { query } = req.body;

  if (!query) {
    throw APIError.badRequest("Query is required");
  }

  // Query Notion for relevant context
  const results = await notionService.queryDatabase(envVars.NOTION_DATABASE_ID);

  // Convert results to text context
  const context = results
    .map((item: any) => `${item.properties.Title?.title?.[0]?.plain_text ?? ""}: ${JSON.stringify(item.properties)}`)
    .join("\n\n");

  // Analyze with Gemini
  const analysis = await geminiService.analyzeWithContext(query, context);

  res.status(200).json({
    status: "success",
    data: analysis,
  });
});

export const generateDoc = catchAsync(async (req: Request, res: Response) => {
  const { topic, context } = req.body;

  if (!topic) {
    throw APIError.badRequest("Topic is required");
  }

  // Generate document content
  const doc = await geminiService.generateDocument(topic, context);

  // Create Notion page
  const page = await notionService.createPage({
    parent: { database_id: envVars.NOTION_DATABASE_ID },
    properties: {
      Title: {
        title: [
          {
            text: {
              content: doc.title,
            },
          },
        ],
      },
      Type: {
        select: {
          name: "document",
        },
      },
    },
  });

  // TODO: Convert markdown content to Notion blocks and append

  res.status(201).json({
    status: "success",
    data: {
      id: page.id,
      url: page.url,
      title: doc.title,
    },
  });
});
