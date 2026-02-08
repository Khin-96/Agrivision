'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, CameraOff, Mic, MicOff, Bot, Eye } from 'lucide-react';
import { GeminiWebSocket } from '../../services/geminiWebSocket';
import { Base64 } from 'js-base64';

interface LiveVisionProps {
  onClose?: () => void;
}

export default function LiveVision({ onClose }: LiveVisionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const geminiWsRef = useRef<GeminiWebSocket | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentConnected, setAgentConnected] = useState(false);
  const [isAudioSetup, setIsAudioSetup] = useState(false);
  const [isWebSocketReady, setIsWebSocketReady] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [outputAudioLevel, setOutputAudioLevel] = useState(0);
  const setupInProgressRef = useRef(false);

  // Cleanup functions
  const cleanupAudio = () => {
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsAudioSetup(false);
  };

  const cleanupWebSocket = () => {
    if (geminiWsRef.current) {
      geminiWsRef.current.disconnect();
      geminiWsRef.current = null;
    }
    setIsWebSocketReady(false);
    setAgentConnected(false);
  };

  // Send audio data to Gemini
  const sendAudioData = (b64Data: string) => {
    if (!geminiWsRef.current) return;
    geminiWsRef.current.sendMediaChunk(b64Data, "audio/pcm");
  };

  // Capture and send image
  const captureAndSendImage = () => {
    if (!videoRef.current || !videoCanvasRef.current || !geminiWsRef.current) return;

    const canvas = videoCanvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    context.drawImage(videoRef.current, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    const b64Data = imageData.split(',')[1];
    geminiWsRef.current.sendMediaChunk(b64Data, "image/jpeg");
  };

  // Start camera
  const startCamera = async () => {
    try {
      setError(null);

      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        }
      });

      audioContextRef.current = new AudioContext({
        sampleRate: 16000,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
        videoRef.current.muted = true;
      }

      const combinedStream = new MediaStream([
        ...videoStream.getTracks(),
        ...audioStream.getTracks()
      ]);

      setStream(combinedStream);
      console.log('Camera and microphone initialized');

    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Failed to access camera and microphone. Please check permissions.');
      cleanupAudio();
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isStreaming) {
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    geminiWsRef.current = new GeminiWebSocket(
      (text) => {
        console.log("Received from Gemini:", text);
      },
      () => {
        console.log("[Camera] WebSocket setup complete, starting media capture");
        setIsWebSocketReady(true);
        setAgentConnected(true);
        setIsConnecting(false);
      },
      (isPlaying) => {
        setIsModelSpeaking(isPlaying);
      },
      (level) => {
        setOutputAudioLevel(level);
      },
      (transcription) => {
        console.log("[Transcription]:", transcription);
      }
    );
    geminiWsRef.current.connect();

    return () => {
      if (imageIntervalRef.current) {
        clearInterval(imageIntervalRef.current);
        imageIntervalRef.current = null;
      }
      cleanupWebSocket();
    };
  }, [isStreaming]);

  // Start image capture only after WebSocket is ready
  useEffect(() => {
    if (!isStreaming || !isWebSocketReady) return;

    console.log("[Camera] Starting image capture interval");
    imageIntervalRef.current = setInterval(captureAndSendImage, 1000);

    return () => {
      if (imageIntervalRef.current) {
        clearInterval(imageIntervalRef.current);
        imageIntervalRef.current = null;
      }
    };
  }, [isStreaming, isWebSocketReady]);

  // Update audio processing setup
  useEffect(() => {
    if (!isStreaming || !stream || !audioContextRef.current ||
      !isWebSocketReady || isAudioSetup || setupInProgressRef.current) return;

    let isActive = true;
    setupInProgressRef.current = true;

    const setupAudioProcessing = async () => {
      try {
        const ctx = audioContextRef.current;
        if (!ctx || ctx.state === 'closed' || !isActive) {
          setupInProgressRef.current = false;
          return;
        }

        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        await ctx.audioWorklet.addModule('/worklets/audio-processor.js');

        if (!isActive) {
          setupInProgressRef.current = false;
          return;
        }

        audioWorkletNodeRef.current = new AudioWorkletNode(ctx, 'audio-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          processorOptions: {
            sampleRate: 16000,
            bufferSize: 4096,
          },
          channelCount: 1,
          channelCountMode: 'explicit',
          channelInterpretation: 'speakers'
        });

        const source = ctx.createMediaStreamSource(stream);
        audioWorkletNodeRef.current.port.onmessage = (event) => {
          if (!isActive || isModelSpeaking) return;
          const { pcmData, level } = event.data;
          setAudioLevel(level);

          const pcmArray = new Uint8Array(pcmData);
          const b64Data = Base64.fromUint8Array(pcmArray);
          sendAudioData(b64Data);
        };

        source.connect(audioWorkletNodeRef.current);
        setIsAudioSetup(true);
        setupInProgressRef.current = false;

        return () => {
          source.disconnect();
          if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.disconnect();
          }
          setIsAudioSetup(false);
        };
      } catch (error) {
        if (isActive) {
          cleanupAudio();
          setIsAudioSetup(false);
        }
        setupInProgressRef.current = false;
      }
    };

    console.log("[Camera] Starting audio processing setup");
    setupAudioProcessing();

    return () => {
      isActive = false;
      setIsAudioSetup(false);
      setupInProgressRef.current = false;
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.disconnect();
        audioWorkletNodeRef.current = null;
      }
    };
  }, [isStreaming, stream, isWebSocketReady, isModelSpeaking]);

  const toggleCamera = async () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCameraOn;
        setIsCameraOn(!isCameraOn);
      }
    }
  };

  const toggleMicrophone = async () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
      }
    }
  };

  const startStreaming = async () => {
    try {
      if (!stream) {
        await startCamera();
      }
      setIsStreaming(true);
    } catch (err) {
      console.error('Failed to start streaming:', err);
      setError(`Failed to start streaming: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const stopStreaming = async () => {
    if (imageIntervalRef.current) {
      clearInterval(imageIntervalRef.current);
      imageIntervalRef.current = null;
    }

    cleanupWebSocket();
    cleanupAudio();

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setIsCameraOn(false);
    setIsMicOn(false);
    setAgentConnected(false);
  };

  const handleBack = () => {
    stopStreaming();
    if (onClose) onClose();
  };

  // Hide controls after 3s
  useEffect(() => {
    if (!showControls) return;
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopStreaming();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" onClick={() => setShowControls(true)}>
      {/* Fullscreen video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Hidden canvas for image capture */}
      <canvas ref={videoCanvasRef} className="hidden" />

      {/* Error message */}
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 bg-red-500 text-white px-4 py-2 rounded-lg max-w-md text-center">
          {error}
          <br />
          <button
            onClick={() => setError(null)}
            className="mt-2 bg-white text-red-500 px-3 py-1 rounded text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Connection status */}
      {isStreaming && (
        <div className="absolute top-4 right-4 z-30 bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${agentConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span>
              {agentConnected ? 'AI Agent Connected' : 'Waiting for AI Agent...'}
            </span>
          </div>
          {agentConnected && (
            <div className="flex items-center space-x-2 mt-1 text-green-400">
              <Eye size={14} />
              <span className="text-xs">Agent can see you</span>
            </div>
          )}
        </div>
      )}

      {/* Top overlay */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-full backdrop-blur-sm transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-4">
            {agentConnected && (
              <div className="flex items-center space-x-2 bg-green-500/80 px-3 py-1 rounded-full text-white text-sm">
                <Bot size={16} />
                <span>AI Listening</span>
              </div>
            )}
            {agentConnected && (
              <div className="flex items-center space-x-2 bg-blue-500/80 px-3 py-1 rounded-full text-white text-sm">
                <Eye size={16} />
                <span>AI Watching</span>
              </div>
            )}
            {isStreaming && (
              <div className="bg-red-500 px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span>LIVE</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom right controls */}
      {showControls && (
        <div className="absolute bottom-10 right-10 z-20 flex items-center space-x-4">
          {/* Camera and Mic controls */}
          <div className="flex items-center space-x-3 bg-black/50 rounded-full p-2 backdrop-blur-sm">
            <button
              onClick={toggleCamera}
              disabled={!stream || isConnecting}
              className={`p-3 rounded-full transition-colors ${isCameraOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500/80 hover:bg-red-600/80'
                } text-white disabled:opacity-50`}
            >
              {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
            </button>

            <button
              onClick={toggleMicrophone}
              disabled={!stream || isConnecting}
              className={`p-3 rounded-full transition-colors ${isMicOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500/80 hover:bg-red-600/80'
                } text-white disabled:opacity-50`}
            >
              {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
          </div>

          {/* Go Live/End Live button */}
          <div>
            {!isStreaming ? (
              <button
                onClick={startStreaming}
                disabled={!stream || isConnecting}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-medium text-lg disabled:opacity-50 transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Go Live'}
              </button>
            ) : (
              <button
                onClick={stopStreaming}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-medium text-lg transition-colors"
              >
                End Live
              </button>
            )}
          </div>
        </div>
      )}

      {/* Connecting overlay */}
      {isConnecting && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="text-center text-white">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p>Connecting to Gemini AI...</p>
            <p className="text-sm mt-2">Establishing secure connection</p>
          </div>
        </div>
      )}

      {/* Audio level indicator */}
      {isStreaming && (
        <div className="absolute bottom-4 left-4 w-64 h-2 rounded-full bg-green-100 z-20">
          <div
            className="h-full rounded-full transition-all bg-green-500"
            style={{
              width: `${isModelSpeaking ? outputAudioLevel : audioLevel}%`,
              transition: 'width 100ms ease-out'
            }}
          />
        </div>
      )}
    </div>
  );
}
