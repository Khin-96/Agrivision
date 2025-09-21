// src/app/api/farm-activities/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// Environment validation
if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY environment variable is required");
}

// Initialize Groq client with enhanced configuration
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000, // 30 seconds timeout
  maxRetries: 3,   // Retry failed requests
});

// Model configuration
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const FALLBACK_MODEL = "llama-3.1-8b-instant"; // Fallback if primary model fails

// Rate limiting (simple in-memory store - use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 50; // requests per window
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

/**
 * Simple rate limiting function
 */
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize
    rateLimitStore.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT) {
    return false; // Rate limited
  }
  
  clientData.count++;
  return true;
}

/**
 * Enhanced system prompt that handles analysis context
 */
function createSystemPrompt(language: string, hasAnalysisContext: boolean): string {
  const basePrompt = `You are Vision, a witty, friendly, and knowledgeable AI farming assistant who loves helping farmers succeed. 

CORE PERSONALITY:
- Friendly and approachable, with a touch of humor
- Expert in all aspects of agriculture (crops, livestock, horticulture, floriculture, aquaculture)
- Provide actionable, practical advice
- Use emojis naturally to make conversations engaging
- When first talking to someone, introduce yourself as "Vision"

RESPONSE GUIDELINES:
- Keep responses conversational but informative (3-6 sentences usually)
- Focus on practical, actionable advice farmers can implement
- If analysis context is provided, prioritize answering based on that specific situation
- Ask clarifying questions when needed
- Share interesting agricultural facts when relevant

EXPERTISE AREAS:
- Crop management and disease identification
- Livestock health and management  
- Soil health and fertilization
- Irrigation and water management
- Pest control and integrated pest management
- Harvest timing and post-harvest handling
- Farm equipment and infrastructure
- Sustainable farming practices
- Market timing and crop selection`;

  const contextPrompt = hasAnalysisContext ? `

ANALYSIS CONTEXT HANDLING:
- You have access to detailed analysis results from the farmer's uploaded image/video
- Use this context to provide specific, personalized advice
- Reference specific findings from the analysis when relevant
- If asked about "the analysis" or "my results", refer to the provided context
- Combine the analysis data with your agricultural expertise for comprehensive answers` : '';

  const languagePrompt = language === 'swahili' ? `

LANGUAGE: Respond in Swahili. Use natural, conversational Swahili that farmers understand.` : `

LANGUAGE: Respond in English using clear, accessible language.`;

  return basePrompt + contextPrompt + languagePrompt;
}

/**
 * Process and prepare the user message
 */
function processUserMessage(message: string, hasAnalysisContext: boolean): string {
  // If the message contains analysis context, clean it up for better processing
  if (message.includes('ANALYSIS CONTEXT')) {
    const parts = message.split('USER QUESTION:');
    if (parts.length === 2) {
      const context = parts[0].replace('ANALYSIS CONTEXT (Use this to answer questions about the farmer\'s specific situation):', '').trim();
      const userQuestion = parts[1].trim();
      
      // Format for better understanding
      return `Based on the following farm analysis:\n\n${context}\n\nFarmer's question: ${userQuestion}`;
    }
  }
  
  return message;
}

/**
 * Main POST handler for chat requests
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let clientId = '';
  
  try {
    // Get client identifier for rate limiting
    clientId = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';
    
    // Check rate limiting
    if (!checkRateLimit(clientId)) {
      console.warn(`Rate limit exceeded for client: ${clientId}`);
      return NextResponse.json(
        { 
          response: "Too many requests. Please wait a moment before trying again.",
          error: "RATE_LIMITED"
        },
        { status: 429 }
      );
    }

    // Parse request body with validation
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('Request parsing error:', parseError);
      return NextResponse.json(
        { 
          response: "Invalid request format. Please try again.",
          error: "INVALID_JSON"
        },
        { status: 400 }
      );
    }

    const { 
      message, 
      chatHistory = [], 
      language = 'english',
      hasAnalysisContext = false 
    } = requestData;

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.warn('Empty or invalid message received');
      return NextResponse.json(
        { 
          response: "Please provide a valid message.",
          error: "EMPTY_MESSAGE"
        },
        { status: 400 }
      );
    }

    // Validate message length (prevent abuse)
    if (message.length > 5000) {
      console.warn(`Message too long: ${message.length} characters`);
      return NextResponse.json(
        { 
          response: "Message too long. Please keep it under 5000 characters.",
          error: "MESSAGE_TOO_LONG" 
        },
        { status: 400 }
      );
    }

    console.log('Processing chat request:', {
      messageLength: message.length,
      historyLength: chatHistory.length,
      language,
      hasAnalysisContext,
      clientId: clientId.substring(0, 8) + '...' // Log partial ID for privacy
    });

    // Build conversation messages
    const systemPrompt = createSystemPrompt(language, hasAnalysisContext);
    const processedMessage = processUserMessage(message, hasAnalysisContext);
    
    const messages = [
      { role: "system", content: systemPrompt },
      ...(chatHistory || []).slice(-10).map((m: any) => ({ 
        role: m.role, 
        content: m.content 
      })), // Limit history to last 10 messages
      { role: "user", content: processedMessage },
    ];

    console.log('Sending to Groq:', {
      model: DEFAULT_MODEL,
      messagesCount: messages.length,
      systemPromptLength: systemPrompt.length
    });

    // Make request to Groq with retry logic
    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.8, // Slightly creative but focused
        max_tokens: 800,  // Reasonable limit for chat responses
        top_p: 0.9,
        frequency_penalty: 0.3, // Reduce repetition
        presence_penalty: 0.1   // Encourage new topics
      });
    } catch (groqError: any) {
      console.error('Primary Groq request failed:', groqError);
      
      // Try fallback model if primary fails
      if (DEFAULT_MODEL !== FALLBACK_MODEL) {
        console.log('Attempting fallback model:', FALLBACK_MODEL);
        try {
          completion = await groq.chat.completions.create({
            model: FALLBACK_MODEL,
            messages,
            temperature: 0.8,
            max_tokens: 800,
          });
        } catch (fallbackError) {
          console.error('Fallback model also failed:', fallbackError);
          throw groqError; // Throw original error
        }
      } else {
        throw groqError;
      }
    }

    // Extract and validate response
    const reply = completion.choices[0]?.message?.content;
    
    if (!reply || reply.trim().length === 0) {
      console.error('Empty response from Groq');
      throw new Error('Empty response from AI service');
    }

    // Log successful response
    const responseTime = Date.now() - startTime;
    console.log('Chat response generated successfully:', {
      responseLength: reply.length,
      responseTime: `${responseTime}ms`,
      tokensUsed: completion.usage?.total_tokens || 'unknown'
    });

    // Return successful response
    return NextResponse.json({ 
      response: reply.trim(),
      metadata: {
        responseTime,
        tokensUsed: completion.usage?.total_tokens,
        model: completion.model || DEFAULT_MODEL
      }
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('Vision API error:', {
      error: error.message || String(error),
      stack: error.stack,
      responseTime: `${responseTime}ms`,
      clientId: clientId.substring(0, 8) + '...'
    });

    // Determine error type and response
    let errorResponse = "I'm having trouble connecting right now. Please try again in a moment! 🤯";
    let statusCode = 500;

    if (error.message?.includes('timeout')) {
      errorResponse = "Response is taking too long. Please try a shorter question! ⏱️";
      statusCode = 504;
    } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
      errorResponse = "I'm getting too many questions right now. Please try again in a few minutes! 😅";
      statusCode = 503;
    } else if (error.message?.includes('model')) {
      errorResponse = "I'm having model issues. Please try again! 🔄";
      statusCode = 502;
    }

    return NextResponse.json(
      { 
        response: errorResponse,
        error: error.message || String(error),
        metadata: {
          responseTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: statusCode }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    { 
      response: "This endpoint only supports POST requests for chat interactions.",
      error: "METHOD_NOT_ALLOWED" 
    },
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