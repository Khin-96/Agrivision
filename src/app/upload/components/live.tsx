"use client";
import { useEffect, useRef, useState } from "react";

export default function LiveTranscriber() {
  const wsRef = useRef<WebSocket | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 16000 }); // ✅ Fix sample rate mismatch
      const source = audioContext.createMediaStreamSource(stream);

      wsRef.current = new WebSocket("ws://localhost:8000/ws/transcribe");

      wsRef.current.onopen = () => {
        console.log("✅ WebSocket connected");
        setIsRecording(true);
      };

      wsRef.current.onmessage = (event) => {
        setTranscript((prev) => prev + " " + event.data);
      };

      wsRef.current.onclose = () => {
        console.log("❌ WebSocket closed");
        setIsRecording(false);
      };

      // Set up audio encoding to send chunks
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const buffer = new ArrayBuffer(inputData.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        wsRef.current.send(buffer);
      };
    } catch (err) {
      console.error("Could not start media:", err);
    }
  };

  const stopRecording = () => {
    if (wsRef.current) wsRef.current.close();
    setIsRecording(false);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">🎙️ Live Transcriber</h1>
      <div className="space-x-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="bg-green-500 px-4 py-2 rounded hover:bg-green-600"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
          >
            Stop
          </button>
        )}
      </div>

      <div className="mt-6 w-full max-w-2xl bg-gray-800 p-4 rounded-lg">
        <p className="whitespace-pre-wrap">{transcript || "Transcript will appear here..."}</p>
      </div>
    </div>
  );
}
