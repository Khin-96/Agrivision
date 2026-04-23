import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3-flash-preview";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const geminiClient = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const groqClient = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

const SYSTEM_PROMPT = `You are an expert agricultural AI.
Return ONLY valid JSON with keys:
- "analysis": markdown identification and health assessment.
- "categories": array of strings (e.g. ["Livestock","Cattle"]).
- "suggestions": array of 3-5 specific actionable recommendations.
- "risks": array of identified risks.
- "didYouKnow": array of 2 interesting facts.
No extra text outside JSON.`;

async function analyzeVisionWithGemini(imageBase64: string, mimeType: string, prompt: string) {
  if (!geminiClient) throw new Error("GEMINI_API_KEY not configured");
  const model = geminiClient.getGenerativeModel({ model: GEMINI_VISION_MODEL });
  const result = await model.generateContent([
    prompt || "Analyze this agricultural image in detail.",
    { inlineData: { mimeType, data: imageBase64 } },
  ]);
  const response = await result.response;
  return response.text();
}

async function explainWithGroq(text: string, prompt: string) {
  if (!groqClient) throw new Error("GROQ_API_KEY not configured");
  const completion = await groqClient.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.7,
    max_tokens: 900,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${prompt || "Provide an agricultural assessment."}\n\nObservations:\n${text}`,
      },
    ],
  });
  return completion.choices[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const action = formData.get("action") as string;
    const prompt = formData.get("prompt") as string;

    if (action === "text") {
      if (!groqClient) throw new Error("GROQ_API_KEY not configured");
      const result = await explainWithGroq(prompt || "", "");
      return NextResponse.json({ success: true, result });
    }

    if (action === "analyze-image" || action === "analyze-video") {
      const file = formData.get("file") as File;
      if (!file) throw new Error("No file uploaded");

      // Save file to public/uploads
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uploadsDir = join(process.cwd(), 'public', 'uploads');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name.replace(/\s+/g, '-')}`;
      const filePath = join(uploadsDir, filename);
      await writeFile(filePath, buffer);
      
      const imageUrl = `/uploads/${filename}`;
      const base64 = buffer.toString("base64");

      const visionText = await analyzeVisionWithGemini(base64, file.type, prompt);
      let result = visionText;

      if (groqClient) {
        result = await explainWithGroq(visionText, prompt);
      }

      return NextResponse.json({ success: true, result, imageUrl });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("? Vision/Groq Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

