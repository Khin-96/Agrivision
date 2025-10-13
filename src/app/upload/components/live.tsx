"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface LiveVisionProps {
  language?: "english" | "kiswahili";
  onClose: () => void;
}

export default function LiveVision({ language = "english", onClose }: LiveVisionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const isCleaningUpRef = useRef(false);
  const connectionAttemptRef = useRef(0);
  
  const [isActive, setIsActive] = useState(false);
  const [aiOutput, setAiOutput] = useState<string>("Initializing...");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [streamingText, setStreamingText] = useState<string>("");

  // 🔌 Initialize Socket.IO connection
  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (socketRef.current) return;

    const timer = setTimeout(() => {
      initSocket();
    }, 100); // Small delay to avoid strict mode issues

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, []);

  const initSocket = () => {
    // Don't create socket if already exists or cleaning up
    if (socketRef.current || isCleaningUpRef.current) {
      console.log("Socket already exists or cleaning up, skipping...");
      return;
    }

    connectionAttemptRef.current += 1;
    console.log(`🔌 Initializing socket connection (attempt ${connectionAttemptRef.current})...`);

    // Connect to Socket.IO server
    const socket = io({
      path: "/socket.io/",
      transports: ["polling", "websocket"], // Start with polling first
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      setIsConnected(true);
      setAiOutput("🔗 Connected to AI server. Initializing camera...");
      
      // Initialize media after connection
      if (!mediaStreamRef.current) {
        initMedia();
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
      
      if (!isCleaningUpRef.current) {
        setAiOutput((prev) => prev + `\n\n⚠️ Disconnected: ${reason}`);
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error.message);
      
      if (connectionAttemptRef.current <= 3) {
        setAiOutput(`❌ Connection attempt ${connectionAttemptRef.current} failed. Retrying...`);
      } else {
        setAiOutput("❌ Failed to connect to server. Please ensure the server is running.");
      }
    });

    socket.on("reconnect_attempt", (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}...`);
      setAiOutput((prev) => prev + `\n\n🔄 Reconnecting (${attempt})...`);
    });

    socket.on("reconnect", (attempt) => {
      console.log(`✅ Reconnected after ${attempt} attempts`);
      setAiOutput((prev) => prev + "\n\n✅ Reconnected!");
    });

    // AI response events
    socket.on("connected", (data) => {
      console.log("Server confirmed:", data);
      setAiOutput("✅ " + data.message);
    });

    socket.on("response_chunk", (data) => {
      setStreamingText((prev) => prev + data.text);
    });

    socket.on("response_complete", async (data) => {
      const fullText = data.fullText;
      setAiOutput((prev) => prev + `\n\n🤖 AI: ${fullText}`);
      setStreamingText("");
      
      if (isActive) {
        await speakText(fullText);
      }
    });

    socket.on("processing_started", () => {
      setStreamingText("");
      setAiOutput((prev) => prev + "\n\n🔄 AI analyzing...");
    });

    socket.on("processing_completed", () => {
      console.log("✅ Processing completed");
    });

    socket.on("frame_received", (data) => {
      console.log("📸 Frame buffered:", data.bufferSize);
    });

    socket.on("audio_received", (data) => {
      console.log("🎤 Audio buffered:", data.bufferSize);
    });

    socket.on("error", (data) => {
      console.error("Server error:", data);
      setAiOutput((prev) => prev + `\n\n❌ Error: ${data.error}`);
    });
  };

  // 🎥 Initialize webcam + mic
  const initMedia = async () => {
    if (mediaStreamRef.current) {
      console.log("Media already initialized");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      
      mediaStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setupAudioRecording(stream);
      
      setIsInitialized(true);
      setAiOutput((prev) => prev + "\n\n🎙️ Ready! Press 'Start' to begin conversation.");
    } catch (error) {
      console.error("Camera/Mic access error:", error);
      setAiOutput("❌ Unable to access camera/microphone. Please grant permissions and refresh.");
    }
  };

  // 🎤 Setup audio recording
  const setupAudioRecording = (stream: MediaStream) => {
    if (recorderRef.current) return;

    try {
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const dest = audioContextRef.current.createMediaStreamDestination();
      const audioInput = audioContextRef.current.createMediaStreamSource(stream);
      audioInput.connect(dest);

      const recorder = new MediaRecorder(dest.stream, { 
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 16000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && socketRef.current?.connected && isActive) {
          e.data.arrayBuffer().then((buffer) => {
            const base64Audio = arrayBufferToBase64(buffer);
            socketRef.current?.emit("audio_chunk", {
              audio: base64Audio,
              mimeType: "audio/webm",
              timestamp: Date.now(),
            });
          });
        }
      };

      recorder.start(2000);
      recorderRef.current = recorder;
    } catch (error) {
      console.error("Audio recording setup error:", error);
    }
  };

  // 🔄 Start continuous streaming
  const startStreaming = () => {
    if (!socketRef.current?.connected || !isInitialized) {
      setAiOutput((prev) => prev + "\n\n⚠️ Not ready. Please wait for connection...");
      return;
    }

    setIsActive(true);
    setAiOutput((prev) => prev + "\n\n▶️ Live streaming started!");

    frameIntervalRef.current = setInterval(() => {
      if (isActive && !isSpeaking) {
        sendVideoFrame();
      }
    }, 1000);

    socketRef.current.emit("text_prompt", {
      prompt: `You are having a live video conversation with a farmer in ${language === "kiswahili" ? "Kiswahili" : "English"}. 
Analyze the video feed and audio in real-time. Respond naturally and conversationally.
Keep responses brief (2-3 sentences) for natural conversation flow.
Focus on farming activities, crop conditions, and answer any questions the farmer asks.`,
    });
  };

  // 📤 Send video frame
  const sendVideoFrame = () => {
    const video = videoRef.current;
    if (!video || !socketRef.current?.connected) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameData = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];

      socketRef.current.emit("video_frame", {
        frame: frameData,
        mimeType: "image/jpeg",
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Send frame error:", error);
    }
  };

  // 🟡 Toggle streaming
  const toggleStreaming = () => {
    if (isActive) {
      setIsActive(false);
      setAiOutput((prev) => prev + "\n\n⏸️ Streaming paused");
      
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      
      socketRef.current?.emit("clear_buffers");
    } else {
      startStreaming();
    }
  };

  // 🔊 Text-to-Speech
  const speakText = async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        resolve();
        return;
      }

      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "kiswahili" ? "sw-KE" : "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        language === "kiswahili" 
          ? voice.lang.startsWith("sw")
          : voice.lang.startsWith("en")
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    });
  };

  // 🧹 Cleanup
  const cleanup = () => {
    if (isCleaningUpRef.current) return;
    
    isCleaningUpRef.current = true;
    console.log("🧹 Cleaning up resources...");

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechSynthesis.cancel();
    }

    if (recorderRef.current?.state !== "inactive") {
      try {
        recorderRef.current?.stop();
      } catch (e) {
        console.warn("Recorder stop error:", e);
      }
    }

    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close().catch(() => {});
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  return (
    <div className="flex flex-col h-full bg-black text-white relative">
      <div className={`absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 ${
        isConnected ? "bg-green-600" : "bg-red-600"
      }`}>
        <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-white animate-pulse" : "bg-gray-300"}`}></span>
        {isConnected ? "Connected" : "Connecting..."}
      </div>

      <div className="relative w-full h-2/3 bg-gray-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover rounded-t-xl"
        />
        
        {isSpeaking && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
            <span className="w-3 h-3 bg-white rounded-full animate-ping"></span>
            <span className="font-semibold">AI Speaking...</span>
          </div>
        )}

        {isActive && !isSpeaking && (
          <div className="absolute bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2">
            <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
            <span className="font-semibold">Streaming...</span>
          </div>
        )}

        {!isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Initializing...</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-gray-900 text-sm font-mono whitespace-pre-wrap">
        {aiOutput}
        {streamingText && (
          <div className="mt-2 text-green-400">
            <span className="animate-pulse">▶</span> {streamingText}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
        <button
          onClick={toggleStreaming}
          disabled={!isInitialized || !isConnected}
          className={`px-6 py-3 rounded-full font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
            isActive
              ? "bg-yellow-500 hover:bg-yellow-600 text-black"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {isActive ? "⏸️ Pause" : "▶️ Start"}
        </button>
        <button
          onClick={handleClose}
          className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-full font-semibold text-white shadow-lg transition-all hover:scale-105"
        >
          🔴 Close
        </button>
      </div>
    </div>
  );
}