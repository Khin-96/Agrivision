// src/app/api/farm-activities/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// Environment validation
if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY environment variable is required");
}

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000, // 30s timeout
  maxRetries: 3,
});

// Model configuration
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

// Rate limiting (simple in-memory store)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 50;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (clientData.count >= RATE_LIMIT) return false;

  clientData.count++;
  return true;
}

function createSystemPrompt(language: string, hasAnalysisContext: boolean): string {
  const basePrompt = `You are Vision, a witty, friendly, and knowledgeable AI farming assistant who loves helping farmers succeed. 

CORE PERSONALITY:
- Friendly and approachable, with a touch of humor
- Expert in all aspects of agriculture
- Provide actionable, practical advice
- Use emojis naturally
- Introduce yourself as "Vision"

RESPONSE GUIDELINES:
- Keep responses conversational but informative
- Focus on practical, actionable advice
- Prioritize provided analysis context
- Ask clarifying questions when needed
- Share interesting agricultural facts when relevant

EXPERTISE AREAS:
- Crop management
- Livestock health
- Soil health
- Irrigation
- Pest control
- Harvest timing
- Farm equipment
- Sustainable farming practices
- Market timing`;

  const contextPrompt = hasAnalysisContext
    ? `

ANALYSIS CONTEXT HANDLING:
- Use detailed analysis results from the farmer's uploaded image/video
- Reference specific findings from the analysis
- Combine analysis data with your expertise`
    : "";

  const languagePrompt =
    language === "swahili"
      ? `

LANGUAGE: Respond in Swahili in a natural, conversational style.`
      : `

LANGUAGE: Respond in English using clear, accessible language.`;

  return basePrompt + contextPrompt + languagePrompt;
}

function processUserMessage(message: string, hasAnalysisContext: boolean): string {
  if (message.includes("ANALYSIS CONTEXT")) {
    const parts = message.split("USER QUESTION:");
    if (parts.length === 2) {
      const context = parts[0]
        .replace(
          "ANALYSIS CONTEXT (Use this to answer questions about the farmer's specific situation):",
          ""
        )
        .trim();
      const userQuestion = parts[1].trim();
      return `Based on the following farm analysis:\n\n${context}\n\nFarmer's question: ${userQuestion}`;
    }
  }
  return message;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let clientId = "anonymous";

  try {
    // Get client identifier from x-forwarded-for header (safe for NextRequest)
    const forwardedFor = req.headers.get("x-forwarded-for");
    clientId = forwardedFor ? forwardedFor.split(",")[0].trim() : "anonymous";

    // Rate limiting
    if (!checkRateLimit(clientId)) {
      console.warn(`Rate limit exceeded for client: ${clientId}`);
      return NextResponse.json(
        {
          response: "Too many requests. Please wait a moment before trying again.",
          error: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Request parsing error:", parseError);
      return NextResponse.json(
        {
          response: "Invalid request format. Please try again.",
          error: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    const { message, chatHistory = [], language = "english", hasAnalysisContext = false } =
      requestData;

    // Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { response: "Please provide a valid message.", error: "EMPTY_MESSAGE" },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { response: "Message too long. Please keep it under 5000 characters.", error: "MESSAGE_TOO_LONG" },
        { status: 400 }
      );
    }

    // Build conversation messages
    const systemPrompt = createSystemPrompt(language, hasAnalysisContext);
    const processedMessage = processUserMessage(message, hasAnalysisContext);

    const messages = [
      { role: "system", content: systemPrompt },
      ...(chatHistory || []).slice(-10).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: processedMessage },
    ];

    // Groq request with retry/fallback
    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 800,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.1,
      });
    } catch (groqError: any) {
      console.error("Primary Groq request failed:", groqError);

      if (DEFAULT_MODEL !== FALLBACK_MODEL) {
        console.log("Attempting fallback model:", FALLBACK_MODEL);
        try {
          completion = await groq.chat.completions.create({
            model: FALLBACK_MODEL,
            messages,
            temperature: 0.8,
            max_tokens: 800,
          });
        } catch (fallbackError) {
          console.error("Fallback model also failed:", fallbackError);
          throw groqError;
        }
      } else {
        throw groqError;
      }
    }

    const reply = completion.choices[0]?.message?.content;
    if (!reply || reply.trim().length === 0) throw new Error("Empty response from AI service");

    const responseTime = Date.now() - startTime;
    return NextResponse.json({
      response: reply.trim(),
      metadata: {
        responseTime,
        tokensUsed: completion.usage?.total_tokens,
        model: completion.model || DEFAULT_MODEL,
      },
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return NextResponse.json(
      {
        response: "I'm having trouble connecting right now. Please try again later! 🤯",
        error: error.message || String(error),
        metadata: { responseTime, timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}

// Unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    { response: "This endpoint only supports POST requests.", error: "METHOD_NOT_ALLOWED" },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { response: "Method not allowed", error: "METHOD_NOT_ALLOWED" },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { response: "Method not allowed", error: "METHOD_NOT_ALLOWED" },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { response: "Method not allowed", error: "METHOD_NOT_ALLOWED" },
    { status: 405 }
  );
}
