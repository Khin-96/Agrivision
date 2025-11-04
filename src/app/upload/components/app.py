# app.py — Vision-AI Live with LiveKit + Gemini + FastAPI
import os, json, base64, logging, asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import google.generativeai as genai
import uvicorn
from livekit import api

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Vision-AI-LIVE")

# --- CONFIG ---
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = set()

# --- LiveKit join token ---
@app.get("/token")
def get_token(identity: str = "user"):
    grant = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    grant.add_grant(api.VideoGrant(room_join=True, room="vision_room"))
    token = grant.to_jwt(identity=identity)
    return {"identity": identity, "token": token}

# --- WebSocket for Gemini AI ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    logger.info(f"Client connected → {len(clients)} active")
    voice_enabled = True
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=10)
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "ping"}))
                continue

            msg = json.loads(data)

            if msg.get("type") == "frame":
                # Video frame sent from client
                image_b64 = msg["data"].split(",")[1]
                image_bytes = base64.b64decode(image_b64)

                logger.info("Analyzing frame with Gemini...")
                try:
                    prompt = """
You are Vision, a friendly AI assistant who sees the world through the camera.
Respond naturally in human speech style with turn-taking:
- Use fillers: "um", "hmm", "you know"
- Include light laughter
- Respond 1-2 short sentences
- Pause briefly before next response
"""
                    response = model.generate_content([
                        prompt,
                        {"inline_data": {"mime_type": "image/jpeg", "data": image_bytes}},
                    ])
                    answer = response.text.strip()
                    logger.info(f"Gemini says: {answer}")

                    # Send text to client
                    await websocket.send_text(json.dumps({
                        "type": "result",
                        "answer": answer
                    }))

                    # Voice output if enabled
                    if voice_enabled:
                        await websocket.send_text(json.dumps({
                            "type": "tts",
                            "text": answer,
                            "voice": "verse"
                        }))

                except Exception as e:
                    logger.exception("Gemini processing error")
                    await websocket.send_text(json.dumps({"error": str(e)}))

            elif msg.get("type") == "toggle_voice":
                voice_enabled = msg["enabled"]
                logger.info(f"Voice {'ON' if voice_enabled else 'OFF'}")
                await websocket.send_text(json.dumps({
                    "type": "voice_status",
                    "enabled": voice_enabled
                }))

    except WebSocketDisconnect:
        clients.remove(websocket)
        logger.info("Client disconnected.")
    except Exception as e:
        clients.discard(websocket)
        logger.error(f"WebSocket error: {e}")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
