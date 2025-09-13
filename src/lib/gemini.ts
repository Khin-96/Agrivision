import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Types for Gemini API responses
export interface GeminiAnalysisResult {
  analysis: string;
  confidence?: number;
  categories?: string[];
  suggestions?: string[];
  schedule?: FarmingSchedule;
  risks?: string[];
  didYouKnow?: string[];
}

export interface GeminiConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export interface FarmingSchedule {
  plantingTimes?: string[];
  harvestingTimes?: string[];
  irrigationSchedule?: string[];
  nutrientManagement?: string[];
  cropRotation?: string[];
  treatmentPlan?: string[];
}

// Default configuration for farming analysis
const DEFAULT_CONFIG: GeminiConfig = {
  temperature: 0.4,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 2000, // Increased for more comprehensive analysis
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

// Enhanced prompt for comprehensive agricultural analysis
function generatePrompt(type: 'image' | 'video', filename: string): string {
  const basePrompt = `You are an expert agricultural AI assistant with knowledge in all farming domains including crops, livestock, horticulture, floriculture, aquaculture, and more. Analyze this ${type} comprehensively and provide a detailed, well-structured analysis without any markdown formatting.

ANALYSIS FORMAT:
Identification: [Identify the subject - plant, animal, fish, etc.]
Health Assessment: [Assess health status]
Growth Stage: [Current growth phase or life stage]
Visible Issues: [Any problems observed]

Environmental Conditions: [Soil/water quality, weather patterns, etc.]
Nutritional Status: [Nutrient assessment]
Pest/Disease Presence: [Any pests or diseases detected]
Equipment/Infrastructure: [Tools, equipment or facilities visible]

RECOMMENDATIONS:
Immediate Actions: [Urgent steps to take]
- [Action 1]
- [Action 2]

Treatment Plan: [Specific treatments if needed]
- [Treatment 1]
- [Treatment 2]

PERSONALIZED FARMING SCHEDULE:
Optimal Planting/Harvesting Times: [Based on analysis and current conditions]
Irrigation Schedule: [Tailored watering recommendations]
Nutrient Management: [Fertilization strategy]
Crop Rotation/Livestock Management: [Rotation or management plan]

RISK ASSESSMENT:
- [Risk 1 with severity level]
- [Risk 2 with severity level]

DID YOU KNOW? (Share 1-2 interesting facts relevant to this subject):
- [Fact 1]
- [Fact 2]

IMPORTANT: Use only plain text with clear section headings followed by colons. No markdown symbols (#, *, **, etc.). Use bullet points with hyphens only. Be specific and actionable in recommendations.

Filename: ${filename}
Current season: ${getCurrentSeason()} (approximate)
Current date: ${new Date().toDateString()}`;

  return basePrompt;
}

// Helper function to determine current season (approximate)
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Fall';
  return 'Winter';
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

// Parse the analysis to extract structured data
function parseAnalysisResult(analysis: string): GeminiAnalysisResult {
  const result: GeminiAnalysisResult = { analysis };
  const lines = analysis.split('\n');
  
  // Extract categories
  const categories: string[] = [];
  if (analysis.toLowerCase().includes('crop')) categories.push('crops');
  if (analysis.toLowerCase().includes('livestock') || analysis.toLowerCase().includes('animal')) categories.push('livestock');
  if (analysis.toLowerCase().includes('flower') || analysis.toLowerCase().includes('ornamental')) categories.push('floriculture');
  if (analysis.toLowerCase().includes('aqua') || analysis.toLowerCase().includes('fish')) categories.push('aquaculture');
  if (analysis.toLowerCase().includes('horticulture') || analysis.toLowerCase().includes('garden')) categories.push('horticulture');
  if (categories.length === 0) categories.push('general agriculture');
  
  result.categories = categories;
  
  // Extract suggestions
  const suggestions: string[] = [];
  const suggestionLines = lines.filter(line => 
    line.trim().startsWith('-') && 
    (line.toLowerCase().includes('recommend') || 
     line.toLowerCase().includes('suggest') ||
     line.toLowerCase().includes('action') ||
     line.toLowerCase().includes('treatment'))
  );
  
  suggestionLines.forEach(line => {
    const suggestion = line.replace(/^-/, '').trim();
    if (suggestion) suggestions.push(suggestion);
  });
  
  if (suggestions.length > 0) result.suggestions = suggestions;
  
  // Extract risks
  const risks: string[] = [];
  const riskSectionIndex = lines.findIndex(line => line.toLowerCase().includes('risk assessment'));
  if (riskSectionIndex !== -1) {
    for (let i = riskSectionIndex + 1; i < lines.length; i++) {
      if (lines[i].trim().startsWith('-')) {
        risks.push(lines[i].replace(/^-/, '').trim());
      } else if (lines[i].trim() && !lines[i].toLowerCase().includes('did you know')) {
        break;
      }
    }
  }
  
  if (risks.length > 0) result.risks = risks;
  
  // Extract "Did You Know" facts
  const didYouKnow: string[] = [];
  const didYouKnowIndex = lines.findIndex(line => line.toLowerCase().includes('did you know'));
  if (didYouKnowIndex !== -1) {
    for (let i = didYouKnowIndex + 1; i < lines.length; i++) {
      if (lines[i].trim().startsWith('-')) {
        didYouKnow.push(lines[i].replace(/^-/, '').trim());
      } else if (lines[i].trim()) {
        break;
      }
    }
  }
  
  if (didYouKnow.length > 0) result.didYouKnow = didYouKnow;
  
  return result;
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

    const cleanedAnalysis = cleanAnalysisText(analysis.trim());
    return parseAnalysisResult(cleanedAnalysis);

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

// Analyze text content with Gemini (for ID verification and text-based queries)
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

    // Enhanced prompt for text analysis
    const enhancedText = `As an expert agricultural advisor, analyze the following information and provide comprehensive recommendations for farming practices, including personalized schedules, treatment plans, and management strategies. Consider all types of agriculture: crops, livestock, horticulture, floriculture, aquaculture, etc.

Provide your analysis in this format:

ANALYSIS:
[Your analysis of the situation]

RECOMMENDATIONS:
Immediate Actions:
- [Action 1]
- [Action 2]

Personalized Schedule:
- Planting/Harvesting: [Recommendations]
- Irrigation: [Schedule]
- Nutrient Management: [Plan]
- Rotation/Management: [Strategy]

Risk Assessment:
- [Risk 1]
- [Risk 2]

DID YOU KNOW?:
- [Relevant fact 1]
- [Relevant fact 2]

Information to analyze: ${text}`;

    const result = await model.generateContent(enhancedText);
    const response = await result.response;
    const analysis = response.text();

    if (!analysis || analysis.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    const cleanedAnalysis = cleanAnalysisText(analysis.trim());
    return parseAnalysisResult(cleanedAnalysis);

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

// Additional function to get personalized farming advice based on location and crop type
export async function getPersonalizedAdvice(
  cropType: string,
  location: string,
  soilData?: string,
  weatherPatterns?: string
): Promise<GeminiAnalysisResult> {
  try {
    const query = `Provide personalized farming advice for ${cropType} in ${location}. 
    ${soilData ? `Soil data: ${soilData}.` : ''}
    ${weatherPatterns ? `Weather patterns: ${weatherPatterns}.` : ''}
    
    Include:
    1. Optimal planting and harvesting times
    2. Irrigation schedule recommendations
    3. Nutrient management strategy
    4. Pest and disease prevention
    5. Crop rotation suggestions (if applicable)
    6. Risk assessment for this region and crop type
    7. 2-3 interesting facts about this crop`;

    return await analyzeText(query);
  } catch (error) {
    console.error('Failed to get personalized advice:', error);
    throw new Error('Failed to generate personalized farming advice');
  }
}