import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Types for Gemini API responses
export interface GeminiAnalysisResult {
  analysis: string;
  confidence?: number;
  categories?: string[];
  suggestions?: string[];
}

export interface GeminiConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

// Default configuration for farming analysis
const DEFAULT_CONFIG: GeminiConfig = {
  temperature: 0.4,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 1000,
};

// Safety settings for content analysis
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Initialize Gemini client
function initializeGemini(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY environment variable is not set. Please add your Google AI API key to your .env.local file.'
    );
  }
  
  return new GoogleGenerativeAI(apiKey);
}

// Convert file to base64 for Gemini API
async function fileToBase64(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return base64;
  } catch (error) {
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get MIME type from file
function getMimeType(file: File): string {
  return file.type;
}

// Enhanced prompt for clean formatting without markdown
function generatePrompt(type: 'image' | 'video', filename: string): string {
  const basePrompt = `You are an expert agricultural AI assistant. Analyze this ${type} and provide a clean, well-structured analysis without any markdown formatting.

ANALYSIS FORMAT:
Plant Identification: [Identify the plant/crop]
Health Assessment: [Assess plant health]
Growth Stage: [Current growth phase]
Visible Issues: [Any problems observed]

Soil Conditions: [Soil quality and moisture]
Irrigation Status: [Watering assessment]
Pest Presence: [Any pests detected]
Disease Symptoms: [Signs of disease]
Nutrient Status: [Nutrient assessment]

Equipment: [Tools or equipment visible]
Infrastructure: [Structures or facilities]

Environmental Factors: [Weather, light, season]
Lighting Conditions: [Light exposure]
Seasonal Indicators: [Time of year clues]

Recommendations: [Actionable advice]
- [Specific recommendation 1]
- [Specific recommendation 2]
- [Specific recommendation 3]

Risk Assessment: [Potential concerns]
- [Risk 1]
- [Risk 2]

IMPORTANT: Use only plain text with clear section headings followed by colons. No markdown symbols (#, *, **, etc.). Use bullet points with hyphens only.

Filename: ${filename}`;

  return basePrompt;
}

// Clean up markdown formatting from the response
function cleanAnalysisText(text: string): string {
  // Remove markdown headers
  let cleaned = text.replace(/#{1,6}\s+/g, '');
  
  // Remove bold/italic markdown
  cleaned = cleaned.replace(/\*\*/g, '');
  cleaned = cleaned.replace(/\*/g, '');
  
  // Remove any other markdown symbols
  cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  
  // Clean up excessive line breaks
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Ensure proper spacing
  cleaned = cleaned.replace(/([a-z])\.([A-Z])/g, '$1. $2');
  
  return cleaned.trim();
}

// Analyze image content with Gemini
export async function analyzeImage(
  file: File, 
  config: GeminiConfig = DEFAULT_CONFIG
): Promise<GeminiAnalysisResult> {
  try {
    const genAI = initializeGemini();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: config,
      safetySettings: SAFETY_SETTINGS
    });

    const base64Data = await fileToBase64(file);
    const mimeType = getMimeType(file);
    const filename = file.name;
    
    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ];

    const prompt = generatePrompt('image', filename);
    
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const analysis = response.text();

    if (!analysis || analysis.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    return {
      analysis: cleanAnalysisText(analysis.trim()),
    };

  } catch (error) {
    console.error('Gemini image analysis error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid or missing Gemini API key');
      }
      if (error.message.includes('quota') || error.message.includes('limit')) {
        throw new Error('Gemini API quota exceeded');
      }
      throw error;
    }
    
    throw new Error('Failed to analyze image with Gemini AI');
  }
}

// Analyze text content with Gemini (for ID verification)
export async function analyzeText(
  text: string,
  config: GeminiConfig = DEFAULT_CONFIG
): Promise<GeminiAnalysisResult> {
  try {
    const genAI = initializeGemini();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      generationConfig: config,
      safetySettings: SAFETY_SETTINGS
    });

    const result = await model.generateContent(text);
    const response = await result.response;
    const analysis = response.text();

    if (!analysis || analysis.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    return {
      analysis: cleanAnalysisText(analysis.trim()),
    };

  } catch (error) {
    console.error('Gemini text analysis error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid or missing Gemini API key');
      }
      if (error.message.includes('quota') || error.message.includes('limit')) {
        throw new Error('Gemini API quota exceeded');
      }
      throw error;
    }
    
    throw new Error('Failed to analyze text with Gemini AI');
  }
}

// Main analysis function that determines content type and calls appropriate analyzer
export async function analyzeContent(
  content: File | string,
  type: 'image' | 'text',
  config?: GeminiConfig
): Promise<GeminiAnalysisResult> {
  try {
    if (type === 'image' && content instanceof File) {
      return await analyzeImage(content, config);
    } else if (type === 'text' && typeof content === 'string') {
      return await analyzeText(content, config);
    } else {
      throw new Error(`Unsupported content type: ${type}`);
    }
  } catch (error) {
    console.error(`Failed to analyze ${type}:`, error);
    throw error;
  }
}