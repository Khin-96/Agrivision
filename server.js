// server.js
require("dotenv").config();
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ==============================
// Config
// ==============================
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const clientSessions = new Map();

// ==============================
// Start Next.js server
// ==============================
app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("❌ Request error:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // ==============================
  // Socket.IO server
  // ==============================
  const io = new Server(server, {
    path: "/socket.io/",
    cors: { 
      origin: "*", 
      methods: ["GET", "POST"],
      credentials: true 
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
  });

  io.on("connection", (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    const session = {
      frameBuffer: [],
      audioBuffer: [],
      conversationHistory: [],
      isProcessing: false,
      lastProcessTime: 0,
      processingTimeout: null,
      model: genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }),
    };
    clientSessions.set(socket.id, session);

    socket.emit("connected", {
      message: "WebSocket connection established",
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // --- Video frame ---
    socket.on("video_frame", (data) => {
      try {
        const { frame, mimeType = "image/jpeg", timestamp } = data;
        session.frameBuffer.push({ data: frame, mimeType, timestamp: timestamp || Date.now() });
        if (session.frameBuffer.length > 5) session.frameBuffer.shift();
        socket.emit("frame_received", { bufferSize: session.frameBuffer.length });
        scheduleAnalysis(socket.id, socket, session);
      } catch (err) {
        console.error("Video frame error:", err);
        socket.emit("error", { error: "Failed to process video frame" });
      }
    });

    // --- Audio chunk ---
    socket.on("audio_chunk", (data) => {
      try {
        const { audio, mimeType = "audio/webm", timestamp } = data;
        session.audioBuffer.push({ data: audio, mimeType, timestamp: timestamp || Date.now() });
        if (session.audioBuffer.length > 10) session.audioBuffer.shift();
        socket.emit("audio_received", { bufferSize: session.audioBuffer.length });
        scheduleAnalysis(socket.id, socket, session);
      } catch (err) {
        console.error("Audio chunk error:", err);
        socket.emit("error", { error: "Failed to process audio chunk" });
      }
    });

    // --- Text prompt ---
    socket.on("text_prompt", (data) => {
      const { prompt } = data;
      if (!prompt) return;
      session.conversationHistory.push({ role: "user", parts: [{ text: prompt }] });
    });

    // --- Clear buffers ---
    socket.on("clear_buffers", () => {
      session.frameBuffer = [];
      session.audioBuffer = [];
      socket.emit("buffers_cleared");
    });

    // --- Disconnect ---
    socket.on("disconnect", () => {
      if (session.processingTimeout) clearTimeout(session.processingTimeout);
      clientSessions.delete(socket.id);
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  // --- Analysis scheduler ---
  function scheduleAnalysis(socketId, socket, session) {
    const now = Date.now();
    if (session.isProcessing || now - session.lastProcessTime < 3000) return;

    session.lastProcessTime = now;
    session.isProcessing = true;

    const parts = []; // Fixed: removed TypeScript type annotation

    // Add last 3 frames
    const frames = session.frameBuffer.slice(-3);
    for (const f of frames) parts.push({ inlineData: { data: f.data, mimeType: f.mimeType } });

    // Add last 2 audio
    const audios = session.audioBuffer.slice(-2);
    for (const a of audios) parts.push({ inlineData: { data: a.data, mimeType: a.mimeType } });

    // Fallback prompt
    if (session.conversationHistory.length === 0) {
      parts.push({
        text: "Analyze live farm activity. Describe briefly and naturally.",
      });
    }

    session.conversationHistory.push({ role: "user", parts });

    socket.emit("processing_started");

    session.model
      .generateContentStream({
        contents: session.conversationHistory,
        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 512 },
      })
      .then(async (result) => {
        let fullText = "";
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            fullText += text;
            socket.emit("response_chunk", { text });
          }
        }
        socket.emit("response_complete", { fullText });
        session.conversationHistory.push({ role: "model", parts: [{ text: fullText }] });
        session.frameBuffer = [];
        session.audioBuffer = [];
      })
      .catch((err) => {
        console.error("Gemini error:", err);
        socket.emit("error", { error: "AI processing failed" });
      })
      .finally(() => {
        session.isProcessing = false;
        socket.emit("processing_completed");
      });
  }

  server.listen(port, hostname, () => {
    console.log(`🌐 Server running at http://${hostname}:${port}`);
    console.log(`🔌 Socket.IO server ready`);
  });
});