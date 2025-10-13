import { NextRequest, NextResponse } from 'next/server';
import { analyzeImage, analyzeVideo, analyzeContent } from '@/lib/gemini';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

interface AnalysisResponse {
  success: boolean;
  analysis?: string;
  error?: string;
  filename?: string;
  type?: string;
  categories?: string[];
  suggestions?: string[];
  risks?: string[];
  didYouKnow?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalysisResponse>> {
  try {
    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!type || !['image', 'video'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing type. Must be "image" or "video"' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', 'farm-activities');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.name.split('.').pop() || '';
    const filename = `${type}-${timestamp}.${fileExtension}`;
    const filePath = join(uploadsDir, filename);

    try {
      // Save file to disk (optional - for record keeping)
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Analyze the content with Gemini AI based on type
      let analysisResult;
      
      if (type === 'image') {
        console.log('Analyzing image with Gemini...');
        analysisResult = await analyzeImage(file);
      } else if (type === 'video') {
        console.log('Analyzing video with Gemini...');
        analysisResult = await analyzeVideo(file);
      } else {
        throw new Error(`Unsupported type: ${type}`);
      }

      console.log('Analysis completed successfully:', {
        filename: file.name,
        type,
        categoriesCount: analysisResult.categories?.length || 0,
        suggestionsCount: analysisResult.suggestions?.length || 0
      });

      // Return successful response with structured data
      return NextResponse.json({
        success: true,
        analysis: analysisResult.analysis,
        filename: file.name,
        type: type,
        categories: analysisResult.categories,
        suggestions: analysisResult.suggestions,
        risks: analysisResult.risks,
        didYouKnow: analysisResult.didYouKnow
      });

    } catch (fileError) {
      console.error('File operation or analysis error:', fileError);
      
      // Handle specific analysis errors
      if (fileError instanceof Error) {
        if (fileError.message.includes('API key')) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'AI service configuration error. Please check API settings.' 
            },
            { status: 500 }
          );
        }
        
        if (fileError.message.includes('quota') || fileError.message.includes('limit')) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'AI service temporarily unavailable due to quota limits. Please try again later.' 
            },
            { status: 503 }
          );
        }
        
        if (fileError.message.includes('File size') || fileError.message.includes('too large')) {
          return NextResponse.json(
            { 
              success: false, 
              error: `${type === 'video' ? 'Video' : 'Image'} file too large. Please use a smaller file.` 
            },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to analyze ${type}. Please try again.` 
        },
        { status: 500 }
      );
    }

  } catch (requestError) {
    console.error('Request processing error:', requestError);

    // Handle request-level errors
    if (requestError instanceof Error) {
      return NextResponse.json(
        { 
          success: false, 
          error: requestError.message || 'Failed to process request. Please try again.' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      },
      { status: 500 }
    );
  }
}

// Handle unsupported HTTP methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST to upload files.' },
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST to upload files.' },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}