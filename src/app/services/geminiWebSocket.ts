import { Base64 } from 'js-base64';
import { TranscriptionService } from './transcriptionService';
import { pcmToWav } from '../utils/audioUtils';

const MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025";
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const HOST = "generativelanguage.googleapis.com";

// Debug logging
console.log("[WebSocket] API_KEY available:", !!API_KEY);
console.log("[WebSocket] API_KEY length:", API_KEY?.length || 0);

if (!API_KEY) {
  console.error("[WebSocket] CRITICAL: NEXT_PUBLIC_GEMINI_API_KEY is not defined!");
  console.error("[WebSocket] Please restart your dev server after setting environment variables");
}

const WS_URL = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

export class GeminiWebSocket {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private isSetupComplete: boolean = false;
  private onMessageCallback: ((text: string) => void) | null = null;
  private onSetupCompleteCallback: (() => void) | null = null;
  private audioContext: AudioContext | null = null;

  // Time-scheduled audio playback (gapless)
  private nextPlayTime: number = 0;
  private isPlayingResponse: boolean = false;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private playbackEndTimer: ReturnType<typeof setTimeout> | null = null;

  private onPlayingStateChange: ((isPlaying: boolean) => void) | null = null;
  private onAudioLevelChange: ((level: number) => void) | null = null;
  private onTranscriptionCallback: ((text: string) => void) | null = null;
  private transcriptionService: TranscriptionService;
  private accumulatedPcmData: string[] = [];

  constructor(
    onMessage: (text: string) => void,
    onSetupComplete: () => void,
    onPlayingStateChange: (isPlaying: boolean) => void,
    onAudioLevelChange: (level: number) => void,
    onTranscription: (text: string) => void
  ) {
    this.onMessageCallback = onMessage;
    this.onSetupCompleteCallback = onSetupComplete;
    this.onPlayingStateChange = onPlayingStateChange;
    this.onAudioLevelChange = onAudioLevelChange;
    this.onTranscriptionCallback = onTranscription;
    // Create AudioContext for playback
    this.audioContext = new AudioContext({
      sampleRate: 24000  // Match the response audio rate
    });
    this.transcriptionService = new TranscriptionService();
  }

  connect() {
    console.log("[WebSocket] Attempting to connect...");
    console.log("[WebSocket] WS_URL:", WS_URL.replace(/key=.*/, 'key=***'));

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[WebSocket] Already connected");
      return;
    }

    try {
      this.ws = new WebSocket(WS_URL);
      console.log("[WebSocket] WebSocket object created");
    } catch (error) {
      console.error("[WebSocket] Failed to create WebSocket:", error);
      return;
    }

    this.ws.onopen = () => {
      console.log("[WebSocket] Connection opened successfully");
      this.isConnected = true;
      this.sendInitialSetup();
    };

    this.ws.onmessage = async (event) => {
      try {
        let messageText: string;
        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          messageText = new TextDecoder('utf-8').decode(bytes);
        } else {
          messageText = event.data;
        }

        await this.handleMessage(messageText);
      } catch (error) {
        console.error("[WebSocket] Error processing message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("[WebSocket] Error occurred:", error);
      console.error("[WebSocket] Error type:", (error as any).type);
      console.error("[WebSocket] Error message:", (error as any).message);
    };

    this.ws.onclose = (event) => {
      console.log("[WebSocket] Connection closed");
      console.log("[WebSocket] Close code:", event.code);
      console.log("[WebSocket] Close reason:", event.reason);
      console.log("[WebSocket] Was clean:", event.wasClean);
      this.isConnected = false;

      // Only attempt to reconnect if we haven't explicitly called disconnect
      if (!event.wasClean && this.isSetupComplete) {
        console.log("[WebSocket] Attempting to reconnect in 1 second...");
        setTimeout(() => this.connect(), 1000);
      }
    };
  }

  private sendInitialSetup() {
    console.log("[WebSocket] Sending initial setup message");
    const setupMessage = {
      setup: {
        model: MODEL,
        generation_config: {
          response_modalities: ["AUDIO"]
        },
        system_instruction: {
          parts: [{
            text: "You are Vision AI, a helpful agricultural AI assistant. You can see the user's crops through their camera and hear them through their microphone. Provide helpful advice about their crops, identify plant diseases, and answer farming questions. Keep your responses concise and conversational."
          }]
        }
      }
    };
    console.log("[WebSocket] Setup message:", JSON.stringify(setupMessage, null, 2));
    this.ws?.send(JSON.stringify(setupMessage));
    console.log("[WebSocket] Setup message sent, waiting for setupComplete response...");
  }

  sendMediaChunk(b64Data: string, mimeType: string) {
    if (!this.isConnected || !this.ws || !this.isSetupComplete) return;

    const message = {
      realtime_input: {
        media_chunks: [{
          mime_type: mimeType === "audio/pcm" ? "audio/pcm" : mimeType,
          data: b64Data
        }]
      }
    };

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("[WebSocket] Error sending media chunk:", error);
    }
  }

  sendTextMessage(text: string) {
    if (!this.isConnected || !this.ws || !this.isSetupComplete) return;

    const message = {
      client_content: {
        turns: [{
          role: "user",
          parts: [{ text: text }]
        }],
        turn_complete: true
      }
    };

    try {
      console.log("[WebSocket] Sending text message:", text);
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("[WebSocket] Error sending text message:", error);
    }
  }

  // Schedule a PCM audio chunk to play gaplessly after the previous chunk
  private scheduleAudioChunk(base64Data: string) {
    if (!this.audioContext) return;

    try {
      // Decode base64 to bytes
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM Int16 to Float32
      const pcmData = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0;
      }

      // Calculate audio level for visualisation
      let sum = 0;
      for (let i = 0; i < float32Data.length; i++) {
        sum += Math.abs(float32Data[i]);
      }
      const level = Math.min((sum / float32Data.length) * 100 * 5, 100);
      this.onAudioLevelChange?.(level);

      const sampleRate = 24000;
      const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      // Schedule this chunk to start exactly when the previous one ends
      const startTime = Math.max(this.audioContext.currentTime, this.nextPlayTime);
      source.start(startTime);

      const chunkDuration = float32Data.length / sampleRate;
      this.nextPlayTime = startTime + chunkDuration;

      this.scheduledSources.push(source);

      // Mark as playing
      if (!this.isPlayingResponse) {
        this.isPlayingResponse = true;
        this.onPlayingStateChange?.(true);
      }

      // Cancel any pending end timer and set a new one
      if (this.playbackEndTimer !== null) {
        clearTimeout(this.playbackEndTimer);
      }
      const msUntilEnd = (this.nextPlayTime - this.audioContext.currentTime) * 1000;
      this.playbackEndTimer = setTimeout(() => {
        this.isPlayingResponse = false;
        this.onPlayingStateChange?.(false);
        this.scheduledSources = [];
        this.playbackEndTimer = null;
      }, msUntilEnd + 100);

    } catch (error) {
      console.error("[WebSocket] Error scheduling audio chunk:", error);
    }
  }

  private stopCurrentAudio() {
    for (const source of this.scheduledSources) {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
    }
    this.scheduledSources = [];
    this.nextPlayTime = 0;
    if (this.playbackEndTimer !== null) {
      clearTimeout(this.playbackEndTimer);
      this.playbackEndTimer = null;
    }
    this.isPlayingResponse = false;
    this.onPlayingStateChange?.(false);
  }

  private async handleMessage(message: string) {
    try {
      const messageData = JSON.parse(message);
      console.log("[WebSocket] Received message:", JSON.stringify(messageData, null, 2));

      if (messageData.setupComplete) {
        console.log("[WebSocket] Setup complete! Connection is ready.");
        this.isSetupComplete = true;
        this.onSetupCompleteCallback?.();

        // Send an initial greeting to prompt Gemini to respond
        console.log("[WebSocket] Sending initial greeting to Gemini");
        this.sendTextMessage("Hello! I'm ready to show you my crops. Please introduce yourself and let me know you can see and hear me.");
        return;
      }

      if (messageData.error) {
        console.error("[WebSocket] Server error:", messageData.error);
        return;
      }

      // Handle audio data
      if (messageData.serverContent?.modelTurn?.parts) {
        const parts = messageData.serverContent.modelTurn.parts;
        for (const part of parts) {
          if (part.inlineData?.mimeType === "audio/pcm;rate=24000") {
            this.accumulatedPcmData.push(part.inlineData.data);
            this.scheduleAudioChunk(part.inlineData.data);
          }
        }
      }

      // Handle turn completion separately
      if (messageData.serverContent?.turnComplete === true) {
        if (this.accumulatedPcmData.length > 0) {
          try {
            const fullPcmData = this.accumulatedPcmData.join('');
            const wavData = await pcmToWav(fullPcmData, 24000);

            const transcription = await this.transcriptionService.transcribeAudio(
              wavData,
              "audio/wav"
            );
            console.log("[Transcription]:", transcription);

            this.onTranscriptionCallback?.(transcription);
            this.accumulatedPcmData = []; // Clear accumulated data
          } catch (error) {
            console.error("[WebSocket] Transcription error:", error);
          }
        }
      }
    } catch (error) {
      console.error("[WebSocket] Error parsing message:", error);
    }
  }

  disconnect() {
    this.isSetupComplete = false;
    this.stopCurrentAudio();
    if (this.ws) {
      this.ws.close(1000, "Intentional disconnect");
      this.ws = null;
    }
    this.isConnected = false;
    this.accumulatedPcmData = [];
    this.nextPlayTime = 0;
  }
}