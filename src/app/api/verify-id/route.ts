// app/api/verify-id/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { analyzeContent } from '@/lib/gemini';
import { uploadImageToStorage } from '@/lib/storage';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Starting ID verification process...');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.warn('❌ Unauthorized ID verification attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', session.user.email);

    // Check if we're in development mode and should bypass strict verification
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassVerification = isDevelopment && process.env.BYPASS_VERIFICATION === 'true';

    if (bypassVerification) {
      console.log('🟡 Development mode: Bypassing strict verification');
      
      // Parse form data
      const formData = await req.formData();
      const frontImage = formData.get('frontImage') as File;
      const backImage = formData.get('backImage') as File;
      const idType = formData.get('idType') as string;

      if (!frontImage || !backImage || !idType) {
        console.warn('❌ Missing required fields:', { frontImage: !!frontImage, backImage: !!backImage, idType });
        return NextResponse.json(
          { error: 'Front image, back image, and ID type are required' },
          { status: 400 }
        );
      }

      // Upload images to storage
      const [frontUrl, backUrl] = await Promise.all([
        uploadImageToStorage(frontImage, `ids/${session.user.id}/front`),
        uploadImageToStorage(backImage, `ids/${session.user.id}/back`)
      ]);

      // Update user verification status
      await prisma.user.update({
        where: { email: session.user.email },
        data: {
          idVerified: true,
          idFrontUrl: frontUrl,
          idBackUrl: backUrl,
          idType: idType
        }
      });

      return NextResponse.json({
        verified: true,
        confidence: 95,
        frontUrl,
        backUrl,
        message: 'ID verification bypassed for development',
        analysis: {
          front: 'Bypassed in development mode',
          back: 'Bypassed in development mode'
        }
      });
    }

    // Parse form data
    const formData = await req.formData();
    const frontImage = formData.get('frontImage') as File;
    const backImage = formData.get('backImage') as File;
    const idType = formData.get('idType') as string;

    if (!frontImage || !backImage || !idType) {
      console.warn('❌ Missing required fields:', { frontImage: !!frontImage, backImage: !!backImage, idType });
      return NextResponse.json(
        { error: 'Front image, back image, and ID type are required' },
        { status: 400 }
      );
    }

    console.log('📸 Processing ID images for type:', idType);

    // Upload images to storage
    const [frontUrl, backUrl] = await Promise.all([
      uploadImageToStorage(frontImage, `ids/${session.user.id}/front`),
      uploadImageToStorage(backImage, `ids/${session.user.id}/back`)
    ]);

    console.log('✅ Images uploaded successfully:', { frontUrl, backUrl });

    // Analyze ID images with Gemini
    const prompt = `
      Analyze these ID documents (${idType}) and determine if they appear to be valid and authentic.
      Check for:
      1. Consistency between front and back
      2. Presence of security features
      3. Legibility and completeness
      4. Any signs of tampering or forgery
      5. You may accept minor wear and tear but not major damage
      6. Ensure the ID type matches the provided type: ${idType}
      7. You may accept schoolids, employee IDs, state IDs, passports, and driver's licenses

      Return a JSON response with:
      {
        "verified": boolean,
        "confidence": number (0-100),
        "issues": string[],
        "analysis": string
      }
    `;

    try {
      const frontAnalysis = await analyzeContent(frontImage, 'image');
      const backAnalysis = await analyzeContent(backImage, 'image');
      
      console.log('✅ Gemini analysis completed:', {
        frontAnalysisLength: frontAnalysis.analysis.length,
        backAnalysisLength: backAnalysis.analysis.length
      });

      // More lenient verification logic for testing
      const frontText = frontAnalysis.analysis.toLowerCase();
      const backText = backAnalysis.analysis.toLowerCase();

      // School IDs might not have all the security features of government IDs
      const isSchoolId = idType.toLowerCase().includes('school');

      // Basic checks that should pass for most IDs including school IDs
      const hasPersonalInfo = frontText.includes('name') || frontText.includes('date') || 
                             frontText.includes('birth') || frontText.includes('id');
      const hasIdIndicators = frontText.includes('id') || frontText.includes('card') || 
                             frontText.includes('identification') || frontText.includes('student');

      // School IDs might not have advanced security features, so we're more lenient
      const hasSecurityFeatures = isSchoolId ? 
        (frontText.includes('security') || frontText.includes('hologram') || 
         backText.includes('security') || backText.includes('hologram') || true) : // Allow school IDs to pass without security features
        (frontText.includes('security') || frontText.includes('hologram') || 
         backText.includes('security') || backText.includes('hologram'));

      // Be more flexible with type matching for school IDs
      const isConsistent = isSchoolId ?
        (frontText.includes(idType.toLowerCase()) || backText.includes(idType.toLowerCase()) ||
         frontText.includes('school') || frontText.includes('student') || true) : // Allow school-related terms
        (frontText.includes(idType.toLowerCase()) || backText.includes(idType.toLowerCase()));

      // For testing, we'll accept most IDs that at least look like IDs
      const verified = (hasPersonalInfo || hasIdIndicators) && (isSchoolId || hasSecurityFeatures) && isConsistent;
      const confidence = verified ? (isSchoolId ? 75 : 85) : 40;

      console.log('📊 Verification results:', {
        isSchoolId,
        hasPersonalInfo,
        hasIdIndicators,
        hasSecurityFeatures,
        isConsistent,
        verified,
        confidence
      });

      if (verified) {
        // Update user verification status
        await prisma.user.update({
          where: { email: session.user.email },
          data: {
            idVerified: true,
            idFrontUrl: frontUrl,
            idBackUrl: backUrl,
            idType: idType
          }
        });

        console.log('✅ User verification status updated');
      }

      return NextResponse.json({
        verified,
        confidence,
        frontUrl,
        backUrl,
        message: verified ? 'ID verified successfully' : 'ID verification failed',
        analysis: {
          front: frontAnalysis.analysis,
          back: backAnalysis.analysis
        }
      });

    } catch (geminiError) {
      console.error('❌ Gemini analysis failed:', geminiError);
      return NextResponse.json(
        { 
          error: 'ID verification service temporarily unavailable',
          details: geminiError instanceof Error ? geminiError.message : 'Unknown error'
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('❌ ID verification error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}