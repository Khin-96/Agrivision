// server.js - Enhanced Real-time Gemini Live Vision Server with Comprehensive Logging
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

// Enhanced logging function
function logInfo(socketId, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`🔵 [${timestamp}] ${socketId}: ${message}`, data || '');
}

function logError(socketId, message, error = null) {
  const timestamp = new Date().toISOString();
  console.error(`🔴 [${timestamp}] ${socketId}: ${message}`, error || '');
}

function logWarn(socketId, message, data = null) {
  const timestamp = new Date().toISOString();
  console.warn(`🟡 [${timestamp}] ${socketId}: ${message}`, data || '');
}

// Real-time processing config
const PROCESSING_INTERVAL = 2000;
const MAX_FRAMES_BUFFER = 2;
const MAX_AUDIO_BUFFER = 3;
const MAX_HISTORY = 8;
const MAX_RETRIES = 3;

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
    pingInterval: 10000,
    pingTimeout: 5000,
    allowEIO3: true,
    maxHttpBufferSize: 1e8,
  });

  io.on("connection", (socket) => {
    logInfo(socket.id, "Client connected");

    // Initialize session
    const session = {
      frameBuffer: [],
      audioBuffer: [],
      conversationHistory: [],
      isProcessing: false,
      lastProcessTime: 0,
      processingTimeout: null,
      systemPrompt: null,
      retryCount: 0,
      model: genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 200,
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
        
        if (!frame || frame.length === 0) {
          logWarn(socket.id, "Empty frame received");
          return;
        }
        
        logInfo(socket.id, "Video frame received", {
          frameSize: frame?.length,
          mimeType,
          bufferSize: session.frameBuffer.length
        });
        
        // Add to buffer
        session.frameBuffer.push({ 
          data: frame, 
          mimeType, 
          timestamp: timestamp || Date.now() 
        });
        
        // Trim buffer
        if (session.frameBuffer.length > MAX_FRAMES_BUFFER) {
          session.frameBuffer.shift();
        }
        
        socket.emit("frame_received", { 
          bufferSize: session.frameBuffer.length 
        });
        
        scheduleAnalysis(socket.id, socket, session);
      } catch (err) {
        logError(socket.id, "Video frame processing error", err);
        socket.emit("error", { error: "Failed to process video frame", details: err.message });
      }
    });

    // --- Audio chunk handler ---
    socket.on("audio_chunk", (data) => {
      try {
        const { audio, mimeType = "audio/pcm", sampleRate = 16000, timestamp } = data;
        
        if (!audio || audio.length === 0) {
          logWarn(socket.id, "Empty audio chunk received");
          return;
        }
        
        logInfo(socket.id, "Audio chunk received", {
          audioSize: audio?.length,
          mimeType,
          sampleRate,
          bufferSize: session.audioBuffer.length
        });
        
        // Add to buffer
        session.audioBuffer.push({ 
          data: audio, 
          mimeType,
          sampleRate,
          timestamp: timestamp || Date.now() 
        });
        
        // Trim buffer
        if (session.audioBuffer.length > MAX_AUDIO_BUFFER) {
          session.audioBuffer.shift();
        }
        
        socket.emit("audio_received", { 
          bufferSize: session.audioBuffer.length 
        });
        
        scheduleAnalysis(socket.id, socket, session, true);
      } catch (err) {
        logError(socket.id, "Audio chunk processing error", err);
        socket.emit("error", { error: "Failed to process audio chunk", details: err.message });
      }
    });

    // --- Text message handler ---
    socket.on("text_message", (data) => {
      try {
        const { text } = data;
        if (!text || text.trim().length === 0) {
          logWarn(socket.id, "Empty text message received");
          return;
        }
        
        logInfo(socket.id, "Text message received", { text });
        
        // Add to conversation history
        session.conversationHistory.push({
          role: "user",
          parts: [{ text: `User said: ${text}` }]
        });
        
        processMultimodalInput(socket, session);
      } catch (err) {
        logError(socket.id, "Text message processing error", err);
        socket.emit("error", { error: "Failed to process text message", details: err.message });
      }
    });

    // --- Text prompt (system instructions) ---
    socket.on("text_prompt", (data) => {
      try {
        const { prompt } = data;
        if (!prompt || prompt.trim().length === 0) {
          logWarn(socket.id, "Empty system prompt received");
          return;
        }
        
        session.systemPrompt = prompt;
        logInfo(socket.id, "System prompt set", { promptLength: prompt.length });
      } catch (err) {
        logError(socket.id, "System prompt processing error", err);
      }
    });

    // --- Clear buffers ---
    socket.on("clear_buffers", () => {
      session.frameBuffer = [];
      session.audioBuffer = [];
      session.isProcessing = false;
      session.retryCount = 0;
      
      if (session.processingTimeout) {
        clearTimeout(session.processingTimeout);
        session.processingTimeout = null;
      }
      
      socket.emit("buffers_cleared");
      logInfo(socket.id, "Buffers cleared");
    });

    // --- Disconnect ---
    socket.on("disconnect", (reason) => {
      if (session.processingTimeout) {
        clearTimeout(session.processingTimeout);
      }
      clientSessions.delete(socket.id);
      logInfo(socket.id, `Client disconnected`, { reason });
    });
  });

  // ==============================
  // Real-time Analysis Scheduler
  // ==============================
  function scheduleAnalysis(socketId, socket, session, isAudioPriority = false) {
    const now = Date.now();
    
    if (session.isProcessing) {
      logWarn(socketId, "Analysis skipped - already processing");
      return;
    }
    
    if (now - session.lastProcessTime < PROCESSING_INTERVAL && !isAudioPriority) {
      logWarn(socketId, "Analysis skipped - too soon since last process");
      return;
    }
    
    if (session.frameBuffer.length === 0 && session.audioBuffer.length === 0) {
      logWarn(socketId, "Analysis skipped - no data available");
      return;
    }

    // Clear any pending timeout
    if (session.processingTimeout) {
      clearTimeout(session.processingTimeout);
      session.processingTimeout = null;
    }

    const delay = isAudioPriority ? 300 : 800;
    logInfo(socketId, `Scheduling analysis`, { delay, isAudioPriority });
    
    session.processingTimeout = setTimeout(() => {
      processMultimodalInput(socket, session);
    }, delay);
  }

  // ==============================
  // Process Multimodal Input
  // ==============================
  async function processMultimodalInput(socket, session) {
    const socketId = socket.id;
    
    if (session.isProcessing) {
      logWarn(socketId, "Already processing - skipping");
      return;
    }
    
    session.lastProcessTime = Date.now();
    session.isProcessing = true;

    logInfo(socketId, "Starting multimodal processing", {
      frames: session.frameBuffer.length,
      audio: session.audioBuffer.length,
      history: session.conversationHistory.length
    });

    const parts = [];

    // Add system prompt if this is first interaction
    if (session.conversationHistory.length === 0 && session.systemPrompt) {
      parts.push({ text: session.systemPrompt });
      logInfo(socketId, "Added system prompt to parts");
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
    logInfo(socketId, `Added ${frames.length} video frames`);

    // Add recent audio with description
    const audios = session.audioBuffer.slice(-MAX_AUDIO_BUFFER);
    if (audios.length > 0) {
      parts.push({
        text: "Based on the audio you just heard, respond conversationally to what the user said."
      });
      for (const a of audios) {
        parts.push({ 
          inlineData: { 
            data: a.data, 
            mimeType: a.mimeType 
          } 
        });
      }
      logInfo(socketId, `Added ${audios.length} audio chunks`);
    }

    // Add contextual prompt for natural conversation
    if (parts.length > 0) {
      parts.push({
        text: "Respond naturally and conversationally. Be brief and human-like. If you see the user, acknowledge their presence naturally."
      });
    }

    // Skip if no content
    if (parts.length === 0) {
      logWarn(socketId, "No parts to process - skipping");
      session.isProcessing = false;
      return;
    }

    // Add to conversation history
    session.conversationHistory.push({ role: "user", parts });

    // Trim history to prevent context overflow
    if (session.conversationHistory.length > MAX_HISTORY * 2) {
      const systemPrompts = session.conversationHistory.filter(
        (msg) => msg.role === "user" && msg.parts.some(p => p.text?.includes("You are having"))
      );
      const recentHistory = session.conversationHistory.slice(-MAX_HISTORY * 2);
      session.conversationHistory = [...systemPrompts.slice(0, 1), ...recentHistory];
      logInfo(socketId, "Trimmed conversation history", { newLength: session.conversationHistory.length });
    }

    socket.emit("processing_started");

    try {
      logInfo(socketId, "Calling Gemini API", { partsCount: parts.length });
      
      // Generate streaming response with retry logic
      const result = await session.model.generateContentStream({
        contents: session.conversationHistory,
      });

      let fullText = "";
      let chunkCount = 0;
      
      // Stream chunks to client in real-time
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullText += text;
          chunkCount++;
          socket.emit("response_chunk", { text });
        }
      }

      logInfo(socketId, "Gemini response completed", { 
        fullTextLength: fullText.length,
        chunkCount 
      });

      // Send complete response
      socket.emit("response_complete", { fullText });
      
      // Add AI response to history
      session.conversationHistory.push({ 
        role: "model", 
        parts: [{ text: fullText }] 
      });

      // Clear audio buffer after successful processing (keep frames)
      session.audioBuffer = [];
      session.retryCount = 0; // Reset retry count on success

      logInfo(socketId, "Processing completed successfully");
      
    } catch (err) {
      logError(socketId, "Gemini processing error", err);
      
      // Retry logic
      if (session.retryCount < MAX_RETRIES) {
        session.retryCount++;
        logWarn(socketId, `Retrying Gemini API call (${session.retryCount}/${MAX_RETRIES})`);
        
        // Clear processing state and retry after delay
        session.isProcessing = false;
        setTimeout(() => {
          processMultimodalInput(socket, session);
        }, 1000 * session.retryCount);
        return;
      }
      
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
    console.log(`📊 Comprehensive logging enabled`);
    console.log(`🔄 Max retries: ${MAX_RETRIES}`);
    console.log(`========================================\n`);
  });
});