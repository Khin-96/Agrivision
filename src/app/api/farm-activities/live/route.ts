// route.ts
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET route only serves as reference
 */
export async function GET(req: NextRequest) {
  return new Response(
    JSON.stringify({
      message: "Socket.IO Live Streaming API",
      description: "Connect via Socket.IO to /api/farm-activities/live",
      events: {
        client_to_server: [
          "video_frame",
          "audio_chunk",
          "text_prompt",
          "clear_buffers",
          "start_analysis",
          "ping",
        ],
        server_to_client: [
          "connected",
          "frame_received",
          "audio_received",
          "response_chunk",
          "response_complete",
          "processing_started",
          "processing_completed",
          "error",
        ],
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
