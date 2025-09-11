import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000,
  maxRetries: 3,
});

const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

export async function POST(req: NextRequest) {
  try {
    const { message, chatHistory, language } = await req.json();

    // Build messages with a fun, chatty tone
    const messages = [
      {
        role: "system",
        content: `
You are Vision, a witty and funny AI assistant who loves farming and jokes.
Answer in a friendly, humorous, and casual style.
If language is swahili, respond in Swahili, else respond in English.
Use emojis naturally! Introduce yourself as "Vision" when first talking.`,
      },
      ...(chatHistory || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content || "Oops, I ran out of clever things to say 😅";

    return NextResponse.json({ response: reply });
  } catch (error: any) {
    console.error("Vision API error:", error);
    return NextResponse.json(
      { response: "Oops! Something went wrong 🤯 Try again.", error: error.message || String(error) },
      { status: 500 }
    );
  }
}
