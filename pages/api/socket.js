// pages/api/socket.js
import { Server } from "socket.io";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const clientSessions = new Map();

export default function handler(req, res) {
  if (res.socket.server.io) {
    console.log("Socket.IO already running");
    res.end();
    return;
  }

  console.log("Starting Socket.IO server...");

  const io = new Server(res.socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  res.socket.server.io = io;

  io.on("connection", (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Initialize session
    const session = {
      frameBuffer: [],
      audioBuffer: [],
      conversationHistory: [],
      isProcessing: false,
      model: genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }),
      processingTimeout: null,
    };
    clientSessions.set(socket.id, session);

    socket.emit("connected", {
      message: "Connected to Socket.IO",
      timestamp: new Date().toISOString(),
    });

    // Video frame handler
    socket.on("video_frame", (data) => {
      const session = clientSessions.get(socket.id);
      if (!session) return;

      const { frame, mimeType = "image/jpeg", timestamp } = data;
      session.frameBuffer.push({ data: frame, mimeType, timestamp: timestamp || Date.now() });

      if (session.frameBuffer.length > 5) session.frameBuffer.shift();

      socket.emit("frame_received", { bufferSize: session.frameBuffer.length });
      scheduleAnalysis(socket, session);
    });

    // Audio chunk handler
    socket.on("audio_chunk", (data) => {
      const session = clientSessions.get(socket.id);
      if (!session) return;

      const { audio, mimeType = "audio/webm", timestamp } = data;
      session.audioBuffer.push({ data: audio, mimeType, timestamp: timestamp || Date.now() });

      if (session.audioBuffer.length > 10) session.audioBuffer.shift();

      socket.emit("audio_received", { bufferSize: session.audioBuffer.length });
      scheduleAnalysis(socket, session);
    });

    // Text prompt handler
    socket.on("text_prompt", (data) => {
      const session = clientSessions.get(socket.id);
      if (!session) return;

      const { prompt } = data;
      if (prompt) {
        session.conversationHistory.push({ role: "user", parts: [{ text: prompt }] });
      }
    });

    // Clear buffers
    socket.on("clear_buffers", () => {
      const session = clientSessions.get(socket.id);
      if (!session) return;

      session.frameBuffer = [];
      session.audioBuffer = [];
      socket.emit("buffers_cleared");
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
      const session = clientSessions.get(socket.id);
      if (session?.processingTimeout) clearTimeout(session.processingTimeout);
      clientSessions.delete(socket.id);
    });
  });

  res.end();
}

// Schedule analysis with debouncing
function scheduleAnalysis(socket, session) {
  if (session.processingTimeout) clearTimeout(session.processingTimeout);

  session.processingTimeout = setTimeout(() => {
    processContent(socket, session);
  }, 3000);
}

// Process content
async function processContent(socket, session) {
  if (session.isProcessing) return;
  if (session.frameBuffer.length === 0 && session.audioBuffer.length === 0) return;

  session.isProcessing = true;
  socket.emit("processing_started");

  try {
    const parts = [];

    // Add frames
    const recentFrames = session.frameBuffer.slice(-3);
    for (const frame of recentFrames) {
      parts.push({ inlineData: { data: frame.data, mimeType: frame.mimeType } });
    }

    // Add audio
    if (session.audioBuffer.length > 0) {
      const recentAudio = session.audioBuffer.slice(-2);
      for (const audio of recentAudio) {
        parts.push({ inlineData: { data: audio.data, mimeType: audio.mimeType } });
      }
    }

    // Add prompt
    if (session.conversationHistory.length === 0) {
      parts.push({
        text: "Analyze the video and audio. Respond naturally and conversationally in 2-3 sentences about farming activities.",
      });
    }

    session.conversationHistory.push({ role: "user", parts });

    // Generate response
    const result = await session.model.generateContentStream({
      contents: session.conversationHistory,
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 512 },
    });

    let fullResponse = "";
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        socket.emit("response_chunk", { text, timestamp: new Date().toISOString() });
      }
    }

    session.conversationHistory.push({ role: "model", parts: [{ text: fullResponse }] });
    socket.emit("response_complete", { fullText: fullResponse, timestamp: new Date().toISOString() });

    session.frameBuffer = [];
    session.audioBuffer = [];
  } catch (error) {
    console.error("Processing error:", error);
    socket.emit("error", { error: "Failed to process content" });
  } finally {
    session.isProcessing = false;
    socket.emit("processing_completed");
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};