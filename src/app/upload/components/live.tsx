"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
  MessageCircle,
} from "lucide-react";

interface LiveVisionProps {
  language?: "english" | "kiswahili";
  onClose: () => void;
}

export default function LiveVision({ language = "english", onClose }: LiveVisionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const isCleaningUpRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasGreetedRef = useRef(false);

  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "ai"; text: string; timestamp: number }>
  >([]);
  const [currentAiResponse, setCurrentAiResponse] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("Initializing...");
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Generate unique IDs for messages
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentAiResponse]);

  useEffect(() => {
    if (!socketRef.current) initSocket();
    return () => cleanup();
  }, []);

  // Initialize Socket.IO
  const initSocket = () => {
    if (socketRef.current || isCleaningUpRef.current) return;

    setConnectionStatus("Connecting...");
    const socket = io({
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setConnectionStatus("Connected");
      initMedia();
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setConnectionStatus("Disconnected");
    });

    socket.on("connect_error", () => setConnectionStatus("Connection failed"));

    socket.on("response_chunk", (data) => {
      setCurrentAiResponse((prev) => prev + data.text);
      setIsAiThinking(true);
    });

    socket.on("response_complete", async (data) => {
      const fullText = data.fullText;
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: "ai", text: fullText, timestamp: Date.now() },
      ]);
      setCurrentAiResponse("");
      setIsAiThinking(false);
      if (!isMuted) await speakText(fullText);
    });

    socket.on("processing_started", () => setIsAiThinking(true));
    socket.on("processing_completed", () => setIsAiThinking(false));
  };

  // Initialize camera and microphone
  const initMedia = async () => {
    if (mediaStreamRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user", frameRate: 30 },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => console.warn("Autoplay blocked"));
      }

      setupAudioRecording(stream);
      if (!hasGreetedRef.current) sendGreeting();
    } catch (err: any) {
      console.error("getUserMedia failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setConnectionStatus("Camera/microphone access denied");
        addSystemMessage("Unable to access camera/microphone. Please grant permissions.");
      } else {
        setConnectionStatus("Media initialization error");
        addSystemMessage(`Error initializing media: ${err.message}`);
      }
    }
  };

  // Send greeting to AI
  const sendGreeting = () => {
    hasGreetedRef.current = true;
    const greeting =
      language === "kiswahili"
        ? "Hujambo! Mimi ni Vision AI. Tunaweza kuzungumza sasa."
        : "Hello! I am Vision AI. Let's start chatting!";
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: "ai", text: greeting, timestamp: Date.now() },
    ]);
    speakText(greeting);

    socketRef.current?.emit("text_prompt", {
      prompt: `User sees greeting: "${greeting}". Respond conversationally in ${
        language === "kiswahili" ? "Kiswahili" : "English"
      }.`,
    });
  };

  // Setup continuous audio streaming
  const setupAudioRecording = (stream: MediaStream) => {
    if (recorderRef.current) return;

    try {
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && socketRef.current?.connected) {
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

      recorder.start(1000); // send audio every 1 second
      recorderRef.current = recorder;
    } catch (err) {
      console.warn("Audio recording failed:", err);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted) speechSynthesis.cancel();
  };

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const track = mediaStreamRef.current.getVideoTracks()[0];
      if (track) track.enabled = !isVideoEnabled;
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const speakText = async (text: string) =>
    new Promise<void>((resolve) => {
      if (!("speechSynthesis" in window) || isMuted) return resolve();
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "kiswahili" ? "sw-KE" : "en-US";
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find((v) =>
        language === "kiswahili" ? v.lang.startsWith("sw") : v.lang.startsWith("en")
      );
      if (preferredVoice) utterance.voice = preferredVoice;
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

  const addSystemMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: "user", text: `ℹ️ ${text}`, timestamp: Date.now() },
    ]);
  };

  const cleanup = () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    try {
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
    } catch (err) {
      console.warn("Recorder stop failed:", err);
    }

    speechSynthesis.cancel();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    socketRef.current?.disconnect();
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer)));

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black text-black overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
          <VideoOff className="w-24 h-24 text-gray-400" />
        </div>
      )}

      {/* Top Status */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-3xl bg-white bg-opacity-10 backdrop-blur-xl border border-black border-opacity-20 shadow-lg flex items-center gap-3 text-black font-medium">
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected ? "bg-emerald-400" : "bg-red-400"
          } animate-pulse`}
        />
        {connectionStatus}
        <button
          onClick={handleClose}
          className="ml-2 p-1 hover:bg-black hover:bg-opacity-20 rounded-full transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Bubbles */}
      <div className="absolute bottom-6 right-6 w-96 max-h-96 overflow-hidden">
        <div className="rounded-2xl bg-white bg-opacity-10 backdrop-blur-xl border border-black border-opacity-20 shadow-lg flex flex-col">
          <div className="px-4 py-2 border-b border-black border-opacity-20 flex items-center gap-2 text-black font-medium">
            <MessageCircle className="w-5 h-5" /> Conversation
          </div>
          <div className="p-3 space-y-2 overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-black scrollbar-thumb-opacity-20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "ai" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl backdrop-blur-md border border-black border-opacity-20 transition-all ${
                    msg.role === "ai"
                      ? "bg-white bg-opacity-20"
                      : "bg-black bg-opacity-40 text-white"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {currentAiResponse && (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-3 py-2 rounded-2xl bg-white bg-opacity-20 backdrop-blur-md border border-black border-opacity-20 shadow-[0_0_10px_2px_rgba(16,185,129,0.5)] transition-all">
                  {currentAiResponse}
                  <span className="inline-block w-2 h-4 bg-black ml-1 animate-pulse"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 px-3 py-2 rounded-3xl bg-white bg-opacity-10 backdrop-blur-xl border border-black border-opacity-20 shadow-md">
        <button
          onClick={toggleVideo}
          className="p-2 rounded-full hover:bg-black hover:bg-opacity-20 transition"
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleMute}
          className="p-2 rounded-full hover:bg-black hover:bg-opacity-20 transition"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
