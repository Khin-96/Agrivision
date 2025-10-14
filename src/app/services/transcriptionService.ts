// app/services/transcriptionService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
// FIXED: Use gemini-2.0-flash-exp instead of gemini-1.5-flash
const MODEL_NAME = "gemini-2.0-flash-exp";

export class TranscriptionService {
  private model;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: MODEL_NAME });
  }

  async transcribeAudio(audioBase64: string, mimeType: string = "audio/wav"): Promise<string> {
    try {
      console.log("[Transcription] Starting audio transcription with model:", MODEL_NAME);
      console.log("[Transcription] Audio data length:", audioBase64.length);
      console.log("[Transcription] MIME type:", mimeType);
      
      const result = await this.model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: audioBase64
          }
        },
        { text: "Please transcribe the spoken language in this audio accurately. Ignore any background noise or non-speech sounds. Only return the transcribed text, nothing else." },
      ]);

      const transcription = result.response.text();
      console.log("[Transcription] Completed:", transcription);
      return transcription;
    } catch (error) {
      console.error("[Transcription] Error:", error);
      throw error;
    }
  }
}