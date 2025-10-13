// server.js - Real-time Gemini Live Vision Server
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

// Real-time processing config
const PROCESSING_INTERVAL = 2000; // Process every 2 seconds for faster responses
const MAX_FRAMES_BUFFER = 3; // Keep last 3 frames
const MAX_AUDIO_BUFFER = 2; // Keep last 2 audio chunks
const MAX_HISTORY = 10; // Keep last 10 conversation turns

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
  // Socket.IO server with optimized config
  // ==============================
  const io = new Server(server, {
    path: "/socket.io/",
    cors: { 
      origin: "*", 
      methods: ["GET", "POST"],
      credentials: true 
    },
    transports: ["websocket", "polling"],
    pingInterval: 10000,
    pingTimeout: 5000,
    allowEIO3: true,
    maxHttpBufferSize: 1e8, // 100MB for larger video frames
  });

  io.on("connection", (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Initialize session with Gemini 2.0 Flash (optimized for real-time)
    const session = {
      frameBuffer: [],
      audioBuffer: [],
      conversationHistory: [],
      isProcessing: false,
      lastProcessTime: 0,
      processingTimeout: null,
      systemPrompt: null,
      model: genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 300, // Shorter responses for real-time chat
        }
      }),
    };
    
    clientSessions.set(socket.id, session);

    socket.emit("connected", {
      message: "Real-time Gemini Live Vision ready",
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // --- Video frame handler ---
    socket.on("video_frame", (data) => {
      try {
        const { frame, mimeType = "image/jpeg", timestamp } = data;
        
        // Add to buffer (keep only recent frames)
        session.frameBuffer.push({ 
          data: frame, 
          mimeType, 
          timestamp: timestamp || Date.now() 
        });
        
        // Trim buffer to max size
        if (session.frameBuffer.length > MAX_FRAMES_BUFFER) {
          session.frameBuffer.shift();
        }
        
        socket.emit("frame_received", { 
          bufferSize: session.frameBuffer.length 
        });
        
        // Schedule processing
        scheduleAnalysis(socket.id, socket, session);
      } catch (err) {
        console.error("Video frame error:", err);
        socket.emit("error", { error: "Failed to process video frame" });
      }
    });

    // --- Audio chunk handler ---
    socket.on("audio_chunk", (data) => {
      try {
        const { audio, mimeType = "audio/webm", timestamp } = data;
        
        // Add to buffer
        session.audioBuffer.push({ 
          data: audio, 
          mimeType, 
          timestamp: timestamp || Date.now() 
        });
        
        // Trim buffer
        if (session.audioBuffer.length > MAX_AUDIO_BUFFER) {
          session.audioBuffer.shift();
        }
        
        socket.emit("audio_received", { 
          bufferSize: session.audioBuffer.length 
        });
        
        // Schedule processing
        scheduleAnalysis(socket.id, socket, session);
      } catch (err) {
        console.error("Audio chunk error:", err);
        socket.emit("error", { error: "Failed to process audio chunk" });
      }
    });

    // --- Text prompt (system instructions) ---
    socket.on("text_prompt", (data) => {
      const { prompt } = data;
      if (!prompt) return;
      
      session.systemPrompt = prompt;
      console.log(`📝 System prompt set for ${socket.id}`);
    });

    // --- Clear buffers ---
    socket.on("clear_buffers", () => {
      session.frameBuffer = [];
      session.audioBuffer = [];
      session.isProcessing = false;
      
      if (session.processingTimeout) {
        clearTimeout(session.processingTimeout);
        session.processingTimeout = null;
      }
      
      socket.emit("buffers_cleared");
      console.log(`🧹 Buffers cleared for ${socket.id}`);
    });

    // --- Disconnect ---
    socket.on("disconnect", () => {
      if (session.processingTimeout) {
        clearTimeout(session.processingTimeout);
      }
      clientSessions.delete(socket.id);
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  // ==============================
  // Real-time Analysis Scheduler
  // ==============================
  function scheduleAnalysis(socketId, socket, session) {
    const now = Date.now();
    
    // Don't process if:
    // 1. Already processing
    // 2. Too soon since last process
    // 3. No data available
    if (
      session.isProcessing || 
      now - session.lastProcessTime < PROCESSING_INTERVAL ||
      (session.frameBuffer.length === 0 && session.audioBuffer.length === 0)
    ) {
      return;
    }

    // Clear any pending timeout
    if (session.processingTimeout) {
      clearTimeout(session.processingTimeout);
    }

    // Debounce: wait a bit for more data to accumulate
    session.processingTimeout = setTimeout(() => {
      processMultimodalInput(socket, session);
    }, 500);
  }

  // ==============================
  // Process Multimodal Input
  // ==============================
  async function processMultimodalInput(socket, session) {
    session.lastProcessTime = Date.now();
    session.isProcessing = true;

    const parts = [];

    // Add system prompt if this is first interaction
    if (session.conversationHistory.length === 0 && session.systemPrompt) {
      parts.push({ text: session.systemPrompt });
    }

    // Add recent video frames
    const frames = session.frameBuffer.slice(-MAX_FRAMES_BUFFER);
    for (const f of frames) {
      parts.push({ 
        inlineData: { 
          data: f.data, 
          mimeType: f.mimeType 
        } 
      });
    }

    // Add recent audio
    const audios = session.audioBuffer.slice(-MAX_AUDIO_BUFFER);
    for (const a of audios) {
      parts.push({ 
        inlineData: { 
          data: a.data, 
          mimeType: a.mimeType 
        } 
      });
    }

    // Add contextual prompt if no system prompt
    if (!session.systemPrompt && parts.length > 0) {
      parts.push({
        text: "Describe what you see and respond to any speech you hear. Be conversational and brief.",
      });
    }

    // Skip if no content
    if (parts.length === 0) {
      session.isProcessing = false;
      return;
    }

    // Add to conversation history
    session.conversationHistory.push({ role: "user", parts });

    // Trim history to prevent context overflow
    if (session.conversationHistory.length > MAX_HISTORY * 2) {
      // Keep system prompt and recent history
      const systemPrompts = session.conversationHistory.filter(
        (msg) => msg.role === "user" && msg.parts.some(p => p.text?.includes("You are having"))
      );
      const recentHistory = session.conversationHistory.slice(-MAX_HISTORY * 2);
      session.conversationHistory = [...systemPrompts.slice(0, 1), ...recentHistory];
    }

    socket.emit("processing_started");

    try {
      // Generate streaming response
      const result = await session.model.generateContentStream({
        contents: session.conversationHistory,
      });

      let fullText = "";
      
      // Stream chunks to client in real-time
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullText += text;
          socket.emit("response_chunk", { text });
        }
      }

      // Send complete response
      socket.emit("response_complete", { fullText });
      
      // Add AI response to history
      session.conversationHistory.push({ 
        role: "model", 
        parts: [{ text: fullText }] 
      });

      // Clear buffers after successful processing
      session.frameBuffer = [];
      session.audioBuffer = [];

      console.log(`✅ Processed for ${socket.id}: ${fullText.substring(0, 50)}...`);
      
    } catch (err) {
      console.error("❌ Gemini processing error:", err);
      socket.emit("error", { 
        error: "AI processing failed. Please try again.",
        details: err.message 
      });
    } finally {
      session.isProcessing = false;
      socket.emit("processing_completed");
    }
  }

  // ==============================
  // Start server
  // ==============================
  server.listen(port, hostname, () => {
    console.log(`\n🚀 ========================================`);
    console.log(`🌐 Server running at http://${hostname}:${port}`);
    console.log(`🔌 Socket.IO ready for real-time connections`);
    console.log(`🤖 Gemini 2.0 Flash ready for live vision`);
    console.log(`========================================\n`);
  });
});