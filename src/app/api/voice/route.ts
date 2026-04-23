import { NextRequest, NextResponse } from "next/server";

/**
 * Handle Voice Callback from Africa's Talking
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();

    const isActive = body.get("isActive");
    const sessionId = body.get("sessionId");
    const callerNumber = body.get("callerNumber");

    console.log(` [Voice] Call from ${callerNumber} | Session: ${sessionId} | Active: ${isActive}`);

    // If call is active, respond with TwiML-like XML instructions
    if (isActive === "1") {
      const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Welcome to AgriVision. We are connecting you to an agricultural expert. Please wait.</Say>
    <Play url="http://www.soundboard.com/handler/DownLoadTrack.ashx?cliptoken=5d86292b-8a5d-4a1d-8a50-e8360d84a7e9" />
</Response>`;

      return new Response(response, {
        headers: { "Content-Type": "application/xml" },
      });
    }

    // Standard empty response for hangup
    return new Response("<Response />", {
      headers: { "Content-Type": "application/xml" },
    });

  } catch (error) {
    console.error(" Voice Error:", error);
    return new Response("<Response><Say>An error occurred.</Say></Response>", {
      headers: { "Content-Type": "application/xml" },
    });
  }
}
