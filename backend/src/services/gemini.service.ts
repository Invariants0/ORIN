import { GoogleGenerativeAI } from "@google/generative-ai";
import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";

export interface ClassificationResult {
  title: string;
  type: "idea" | "task" | "note" | "research" | "code";
  tags: string[];
  summary: string;
  content: string;
}

export interface AnalysisResult {
  summary: string;
  insights: string[];
  references: string[];
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(envVars.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  }

  async classifyContent(input: string): Promise<ClassificationResult> {
    const prompt = `You are a content classification assistant. Analyze the following input and return a structured JSON response.

Input: "${input}"

Return ONLY valid JSON in this exact format:
{
  "title": "A concise title for this content",
  "type": "idea|task|note|research|code",
  "tags": ["tag1", "tag2"],
  "summary": "Brief summary in 1-2 sentences",
  "content": "Full processed content"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : text;
      
      const parsed = JSON.parse(jsonString) as ClassificationResult;
      
      logger.info("[Gemini] Content classified successfully");
      return parsed;
    } catch (error) {
      logger.error("[Gemini] Failed to classify content", error);
      throw error;
    }
  }

  async analyzeWithContext(query: string, context: string): Promise<AnalysisResult> {
    const prompt = `You are an intelligent analysis assistant. Answer the user's query using the provided context.

Query: "${query}"

Context from Notion:
${context}

Provide your answer in this exact JSON format:
{
  "summary": "Direct answer to the query",
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"],
  "references": ["Reference link or source 1", "Reference link or source 2"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : text;
      
      const parsed = JSON.parse(jsonString) as AnalysisResult;
      
      logger.info("[Gemini] Analysis completed successfully");
      return parsed;
    } catch (error) {
      logger.error("[Gemini] Failed to analyze context", error);
      throw error;
    }
  }

  async generateDocument(topic: string, context?: string): Promise<any> {
    const prompt = `You are a professional document generator. Create a structured document about: "${topic}"

${context ? `Additional context:\n${context}\n` : ""}

Generate a structured document with:
- Clear title
- Section headings (H2, H3)
- Bullet points for key information
- Tables where appropriate
- Professional formatting

Return the content in a structured format that can be converted to Notion blocks.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      logger.info("[Gemini] Document generated successfully");
      return {
        title: topic,
        content: text,
      };
    } catch (error) {
      logger.error("[Gemini] Failed to generate document", error);
      throw error;
    }
  }

  async continueWork(lastSession: string, relatedContext: string): Promise<string> {
    const prompt = `You are a productivity assistant helping to resume work.

Last session summary:
${lastSession}

Related context from Notion:
${relatedContext}

Provide:
1. Brief summary of what was accomplished
2. Current status
3. Suggested next steps (3-5 actionable items)

Format your response clearly with sections.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      logger.info("[Gemini] Continue work suggestions generated");
      return text;
    } catch (error) {
      logger.error("[Gemini] Failed to generate continue work suggestions", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
export default geminiService;
