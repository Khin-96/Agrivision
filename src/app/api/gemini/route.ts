import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, imageBase64 } = await req.json();

    console.log("Received Gemini request:", { 
      textLength: text?.length,
      hasImage: !!imageBase64,
      imageSize: imageBase64?.length 
    });

    if (!text) {
      return NextResponse.json(
        { error: 'Missing text input' },
        { status: 400 }
      );
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key not configured');
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Prepare the prompt for Gemini
    const prompt = `The user said: "${text}". Please provide a helpful, natural response. Keep it concise and friendly. If you can see their face or surroundings in the image, you can reference what you see.`;

    // Use Gemini 2.5 Flash - supports both text and vision
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // Build parts array dynamically
    const parts: any[] = [{ text: prompt }];
    
    // Add image if provided
    if (imageBase64) {
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: imageBase64
        }
      });
    }

    const requestBody = {
      contents: [
        {
          parts: parts
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200,
      }
    };

    console.log("Calling Gemini 2.5 Flash API...", { 
      hasImage: !!imageBase64
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', response.status, errorData);
      return NextResponse.json(
        { error: `Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Gemini API success, response structure:", Object.keys(data));
    
    // Extract the response text from Gemini
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!output) {
      console.error('No response text from Gemini. Full response:', data);
      return NextResponse.json(
        { error: 'No response generated from Gemini' },
        { status: 500 }
      );
    }

    console.log("Gemini response successful:", output.substring(0, 100) + '...');
    
    return NextResponse.json({ output });

  } catch (error) {
    console.error('Error in Gemini API route:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}