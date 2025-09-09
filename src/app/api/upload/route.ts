import { NextRequest, NextResponse } from 'next/server';
import { analyzeContent } from '@/lib/gemini';
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
      // Save file to disk
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Analyze the content with Gemini AI
      const analysisResult = await analyzeContent(filePath, type as 'image' | 'video');

      // Return successful response
      return NextResponse.json({
        success: true,
        analysis: analysisResult.analysis,
        filename: file.name,
        type: type
      });

    } catch (fileError) {
      console.error('File operation error:', fileError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to save or analyze file. Please try again.' 
        },
        { status: 500 }
      );
    }

  } catch (analysisError) {
    console.error('Analysis error:', analysisError);

    // Handle specific error types
    if (analysisError instanceof Error) {
      if (analysisError.message.includes('API key')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'AI analysis service configuration error. Please check API settings.' 
          },
          { status: 500 }
        );
      }
      
      if (analysisError.message.includes('quota') || analysisError.message.includes('limit')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'AI analysis service temporarily unavailable. Please try again later.' 
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze content. Please try again.' 
      },
      { status: 500 }
    );
  }
}

// Handle unsupported HTTP methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}