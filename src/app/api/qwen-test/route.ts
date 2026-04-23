import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUD_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_SECRET,
});

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

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");

      // Upload to Cloudinary
      const uploadPromise = new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: action === "analyze-video" ? "video" : "image",
            folder: "agrivision/analyses",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      const cloudinaryResponse = await uploadPromise as any;
      const imageUrl = cloudinaryResponse.secure_url;

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

