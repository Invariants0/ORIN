import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function testGeminiApiKey(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.error("[FAIL] GEMINI_API_KEY is missing in backend/.env");
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL?.trim();
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent("Return exactly one word: OK");
    const text = result.response.text().trim();

    console.log("[PASS] GEMINI_API_KEY is valid.");
    console.log(`Model response: ${text}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[FAIL] GEMINI_API_KEY test failed.");
    console.error(`Reason: ${message}`);
    process.exit(1);
  }
}

await testGeminiApiKey();
