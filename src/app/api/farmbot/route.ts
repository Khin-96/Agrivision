//app/api/farmbot/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

// TypeScript interfaces
interface TextRequest {
  type: 'text';
  content: string;
}

interface ImageRequest {
  type: 'image';
  image: File;
}

interface GeminiAnalysisResult {
  analysis: string;
  recommendations: string[];
  personalizedSchedule: { timeframe: string; tasks: string[] }[];
  risks: string[];
  didYouKnow: string;
  confidence: number;
  provider: 'gemini' | 'groq';
}

interface APIError {
  error: string;
  details?: string;
  provider?: 'gemini' | 'groq';
  timestamp: string;
}

// Initialize AI clients
let geminiClient: GoogleGenerativeAI | null = null;
let groqClient: Groq | null = null;

if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('[Farmbot API] Gemini client initialized');
  } catch (err) {
    console.error('[Farmbot API] Failed to init Gemini:', err);
  }
}

if (process.env.GROQ_API_KEY) {
  try {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log('[Farmbot API] Groq client initialized');
  } catch (err) {
    console.error('[Farmbot API] Failed to init Groq:', err);
  }
}

// Farmbot system prompt
const FARM_SYSTEM_PROMPT = `You are an expert agricultural AI assistant specializing in farm management, crop analysis, and agricultural best practices.

Always respond in this JSON format:
{
  "analysis": "Detailed analysis of the query or image",
  "recommendations": ["Specific actionable recommendation 1", "Specific actionable recommendation 2"],
  "personalizedSchedule": [
    {"timeframe": "This week", "tasks": ["Task 1","Task 2"]},
    {"timeframe": "Next 2 weeks", "tasks": ["Task 1","Task 2"]}
  ],
  "risks": ["Potential risk 1","Potential risk 2"],
  "didYouKnow": "Interesting agricultural fact",
  "confidence": 85
}

Guidelines:
- Practical, actionable advice
- Consider local climate and seasons
- Include specific timeframes
- Highlight risks and preventive measures
- Share educational agricultural facts
- Confidence score 0-100
- For images: analyze crop health, pests, soil
- For text: farm management advice
- Respond with valid JSON only`;

// Helpers
async function fileToBase64(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString('base64');
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function validateAndSanitizeRequest(data: any): TextRequest | ImageRequest {
  if (!data || typeof data !== 'object') throw new Error('Invalid request data');

  if (data.type === 'text') {
    if (!data.content || typeof data.content !== 'string') throw new Error('Text content required');
    const content = data.content.trim();
    if (!content) throw new Error('Text content cannot be empty');
    if (content.length > 5000) throw new Error('Text too long (max 5000 chars)');
    return { type: 'text', content };
  }
  throw new Error('Invalid request type');
}

function validateImageFile(file: File) {
  if (!file) throw new Error('Image file required');
  const allowedTypes = ['image/jpeg','image/jpg','image/png','image/webp'];
  if (!allowedTypes.includes(file.type)) throw new Error('Invalid file type');
  if (file.size > 10*1024*1024) throw new Error('File too large (>10MB)');
  if (file.size < 1024) throw new Error('File too small (<1KB)');
}

function createFallbackResponse(query: string): GeminiAnalysisResult {
  return {
    analysis: `Unable to provide detailed analysis. General guidance for: "${query.substring(0,100)}..."`,
    recommendations: [
      "Check soil moisture",
      "Monitor crops for stress/disease",
      "Maintain irrigation schedule",
      "Consult local extension services"
    ],
    personalizedSchedule: [
      { timeframe:"This week", tasks:["Inspect crops","Check irrigation","Review weather forecasts"] },
      { timeframe:"Next 2 weeks", tasks:["Plan fertilization","Schedule pest monitoring","Prepare for seasonal changes"] }
    ],
    risks: ["Weather-related stress","Potential pests","Irrigation failures"],
    didYouKnow: "Regular soil testing every 2-3 years optimizes crop yield.",
    confidence: 60,
    provider: 'groq'
  };
}

// AI Analysis functions
async function analyzeTextWithGemini(content: string): Promise<GeminiAnalysisResult> {
  if (!geminiClient) throw new Error('Gemini client not initialized');
  const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContent([FARM_SYSTEM_PROMPT, `User Query: ${content}`]);
  const text = (await result.response).text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const analysis = jsonMatch ? safeJsonParse<GeminiAnalysisResult>(jsonMatch[0]) : null;
  if (!analysis) throw new Error('Invalid JSON from Gemini');
  return { ...analysis, provider: 'gemini' };
}

async function analyzeImageWithGemini(file: File): Promise<GeminiAnalysisResult> {
  if (!geminiClient) throw new Error('Gemini client not initialized');
  const model = geminiClient.getGenerativeModel({ model: 'gemini-pro-vision' });
  const base64Data = await fileToBase64(file);
  const result = await model.generateContent([
    FARM_SYSTEM_PROMPT,
    { inlineData: { mimeType: file.type, data: base64Data } },
    'Analyze this agricultural image.'
  ]);
  const text = (await result.response).text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const analysis = jsonMatch ? safeJsonParse<GeminiAnalysisResult>(jsonMatch[0]) : null;
  if (!analysis) throw new Error('Invalid JSON from Gemini Vision');
  return { ...analysis, provider: 'gemini' };
}

async function analyzeTextWithGroq(content: string): Promise<GeminiAnalysisResult> {
  if (!groqClient) throw new Error('Groq client not initialized');
  const completion = await groqClient.chat.completions.create({
    messages: [{ role:'system', content:FARM_SYSTEM_PROMPT }, { role:'user', content:`Farm management query: ${content}` }],
    model:'llama3-70b-8192', temperature:0.7, max_tokens:1024
  });
  const text = completion.choices[0]?.message?.content || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const analysis = jsonMatch ? safeJsonParse<GeminiAnalysisResult>(jsonMatch[0]) : null;
  if (!analysis) throw new Error('Invalid JSON from Groq');
  return { ...analysis, provider: 'groq' };
}

// POST Handler
export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = `req-${start}-${Math.random().toString(36).substring(2,9)}`;

  try {
    const contentType = request.headers.get('content-type') || '';
    let requestData: TextRequest | ImageRequest;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const type = formData.get('type') as string;
      const file = formData.get('image') as File;
      if (type !== 'image') throw new Error('Form type must be "image"');
      validateImageFile(file);
      requestData = { type: 'image', image: file };
    } else if (contentType.includes('application/json')) {
      const jsonData = await request.json();
      requestData = validateAndSanitizeRequest(jsonData);
    } else {
      throw new Error('Unsupported content type');
    }

    let result: GeminiAnalysisResult;

    if (geminiClient) {
      try {
        if (requestData.type === 'text') result = await analyzeTextWithGemini(requestData.content);
        else result = await analyzeImageWithGemini(requestData.image);
      } catch (geminiError) {
        console.error(`[Farmbot API][${requestId}] Gemini failed:`, geminiError);
        if (requestData.type === 'text' && groqClient) {
          try { result = await analyzeTextWithGroq(requestData.content); }
          catch { result = createFallbackResponse(requestData.content); }
        } else { result = createFallbackResponse('Image analysis'); }
      }
    } else if (requestData.type === 'text' && groqClient) {
      try { result = await analyzeTextWithGroq(requestData.content); }
      catch { result = createFallbackResponse(requestData.content); }
    } else {
      result = createFallbackResponse('Farm query');
    }

    const duration = Date.now() - start;
    return NextResponse.json(result, {
      status: 200,
      headers: { 'X-Request-ID': requestId, 'X-Response-Time': `${duration}ms`, 'X-Provider': result.provider }
    });

  } catch (err) {
    const duration = Date.now() - start;
    const message = err instanceof Error ? err.message : 'Unknown error';
    const errorResponse: APIError = { error: 'Farm analysis failed', details: message, timestamp: new Date().toISOString() };
    const status = message.includes('Invalid') || message.includes('required') ? 400 : 500;
    return NextResponse.json(errorResponse, { status, headers: { 'X-Request-ID': requestId, 'X-Response-Time': `${duration}ms` } });
  }
}

// GET Handler
export async function GET(): Promise<NextResponse> {
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      gemini: { available: !!geminiClient, capabilities:['text','image'] },
      groq: { available: !!groqClient, capabilities:['text'] }
    },
    version:'1.0.0',
    supportedFormats:{ text:['application/json'], image:['image/jpeg','image/png','image/webp'] },
    limits:{ textMaxLength:5000, imageMaxSize:'10MB', imageMimeTypes:['image/jpeg','image/png','image/webp'] }
  };
  return NextResponse.json(status, { headers:{ 'Cache-Control':'no-cache' } });
}
