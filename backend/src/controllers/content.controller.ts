import { Request, Response } from "express";
import catchAsync from "@/handlers/async.handler.js";
import { APIError } from "@/utils/errors.js";
import envVars from "@/config/envVars.js";
import intentService from "@/services/ai/intent.service.js";
import geminiService from "@/services/ai/gemini.service.js";
import notionWriteService from "@/services/integrations/notion-write.service.js";
import contextRetrievalService from "@/services/integrations/context-retrieval.service.js";
import notionService from "@/services/integrations/notion.service.js";

export const storeContent = catchAsync(async (req: Request, res: Response) => {
  const { input } = req.body as { input?: string };
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) throw APIError.unauthorized("Authentication required");

  if (!input || typeof input !== "string" || input.trim().length === 0) {
    throw APIError.badRequest("input is required and must be a non-empty string");
  }

  const trimmedInput = input.trim();
  const user = ((req as any).user || {}) as { geminiKey?: string };
  const apiKey = user.geminiKey;

  const intent = await intentService.detectIntent(trimmedInput, apiKey);
  const classification = await geminiService.classifyContent(trimmedInput, apiKey);

  const result = await notionWriteService.createInboxEntry({
    title: classification.title,
    type: classification.type,
    tags: classification.tags,
    summary: classification.summary,
    content: classification.content,
    source: intent.intent.type,
    userId,
  });

  res.status(200).json({
    success: true,
    data: {
      id: result.pageId,
      title: classification.title,
      type: classification.type,
      tags: classification.tags,
      summary: classification.summary,
      storedAt: new Date().toISOString(),
      url: result.url,
    },
  });
});

export const retrieveContext = catchAsync(async (req: Request, res: Response) => {
  const { query } = req.body as { query?: string };
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) throw APIError.unauthorized("Authentication required");

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    throw APIError.badRequest("query is required and must be a non-empty string");
  }

  const trimmedQuery = query.trim();
  const searchTerms = Array.from(
    new Set(
      trimmedQuery
        .toLowerCase()
        .split(/\s+/)
        .map((term) => term.replace(/[^\w-]/g, ""))
        .filter((term) => term.length > 2)
    )
  ).slice(0, 10);

  const result = await contextRetrievalService.retrieveContext({
    query: trimmedQuery,
    searchTerms: searchTerms.length ? searchTerms : [trimmedQuery],
    userId,
    limit: 10,
  });

  res.status(200).json({
    success: true,
    data: {
      results: result.topMatches.map((match) => ({
        id: match.id,
        title: match.title,
        content: match.content,
        relevanceScore: match.relevanceScore,
        source: match.url,
        createdAt: match.createdAt,
      })),
      query: trimmedQuery,
      totalFound: result.total,
    },
  });
});

export const analyzeContent = catchAsync(async (req: Request, res: Response) => {
  const { target } = req.body as { target?: string };
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) throw APIError.unauthorized("Authentication required");

  if (!target || typeof target !== "string" || target.trim().length === 0) {
    throw APIError.badRequest("target is required and must be a non-empty string");
  }

  const databaseId = envVars.NOTION_DATABASE_ID;
  if (!databaseId) {
    throw APIError.badRequest("NOTION_DATABASE_ID is not configured");
  }

  const pages = await notionService.queryDatabase(databaseId);
  const uniqueTags = new Set<string>();

  for (const page of pages as any[]) {
    const tags = page?.properties?.Tags?.multi_select || page?.properties?.tags?.multi_select || [];
    for (const tag of tags) {
      if (tag?.name) uniqueTags.add(tag.name);
    }
  }

  const user = ((req as any).user || {}) as { geminiKey?: string };
  const apiKey = user.geminiKey;
  const analysis = await geminiService.analyzeWithContext(
    `Analyze memory status for target: ${target}`,
    `Total pages: ${pages.length}\nKnown tags: ${Array.from(uniqueTags).join(", ") || "none"}`,
    apiKey
  );

  res.status(200).json({
    success: true,
    data: {
      databases: 1,
      pages: pages.length,
      tags: Array.from(uniqueTags),
      insights: [analysis.summary, ...(analysis.insights || [])],
    },
  });
});

export const generateDocument = catchAsync(async (req: Request, res: Response) => {
  const { topic, context } = req.body as { topic?: string; context?: string };
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) throw APIError.unauthorized("Authentication required");

  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    throw APIError.badRequest("topic is required and must be a non-empty string");
  }

  const user = ((req as any).user || {}) as { geminiKey?: string };
  const apiKey = user.geminiKey;
  const document = await geminiService.generateDocument(topic.trim(), context, apiKey);
  const saved = await notionWriteService.createInboxEntry({
    title: document.title,
    type: "document",
    tags: (document.metadata?.tags as string[]) || [],
    summary: typeof document.metadata?.summary === "string" ? document.metadata.summary : undefined,
    content: document.content,
    source: `Generated from topic: ${topic.trim()}`,
    userId,
  });

  res.status(200).json({
    success: true,
    data: {
      title: document.title,
      content: document.content,
      notionPageUrl: saved.url,
      generatedAt: new Date().toISOString(),
    },
  });
});

