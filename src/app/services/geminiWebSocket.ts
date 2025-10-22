// src/app/services/geminiWebSocket.ts
import { Base64 } from 'js-base64';

const MODEL = "models/gemini-2.0-flash-exp";
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const HOST = "generativelanguage.googleapis.com";
const WS_URL = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

export class GeminiWebSocket {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private isSetupComplete: boolean = false;
  private onMessageCallback: ((text: string) => void) | null = null;
  private onSetupCompleteCallback: (() => void) | null = null;
  private audioContext: AudioContext | null = null;
  
  // Audio queue management
  private audioQueue: Float32Array[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private onPlayingStateChange: ((isPlaying: boolean) => void) | null = null;
  private onAudioLevelChange: ((level: number) => void) | null = null;
  private onTranscriptionCallback: ((text: string) => void) | null = null;

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
    
    // Initialize AudioContext on user gesture
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new AudioContext({
        sampleRate: 24000
      });
    } catch (error) {
      console.error("[AudioContext] Initialization failed:", error);
    }
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    console.log("[WebSocket] Connecting to Gemini...");
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log("[WebSocket] Connected");
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
      console.error("[WebSocket] Error:", error);
    };

    this.ws.onclose = (event) => {
      console.log("[WebSocket] Closed:", event.code, event.reason);
      this.isConnected = false;
      this.isSetupComplete = false;
      
      // Reconnect after delay if not intentional disconnect
      if (!event.wasClean) {
        setTimeout(() => {
          console.log("[WebSocket] Attempting reconnect...");
          this.connect();
        }, 3000);
      }
    };
  }

  private sendInitialSetup() {
    const setupMessage = {
      setup: {
        model: MODEL,
        generation_config: {
          response_modalities: ["AUDIO", "TEXT"],
          max_output_tokens: 500
        }
      }
    };
    
    try {
      this.ws?.send(JSON.stringify(setupMessage));
      console.log("[WebSocket] Setup sent");
    } catch (error) {
      console.error("[WebSocket] Setup send error:", error);
    }
  }

  sendMediaChunk(b64Data: string, mimeType: string) {
    if (!this.isConnected || !this.ws || !this.isSetupComplete) {
      console.warn("[WebSocket] Not ready for media chunk");
      return;
    }

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

  private async playAudioResponse(base64Data: string) {
    if (!this.audioContext || this.audioContext.state === 'suspended') {
      await this.audioContext?.resume();
    }

    try {
      // Decode base64 to bytes
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert to Int16Array (PCM format)
      const pcmData = new Int16Array(bytes.buffer);
      
      // Convert to float32 for Web Audio API
      const float32Data = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0;
      }

      // Add to queue and start playing if not already playing
      this.audioQueue.push(float32Data);
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error("[WebSocket] Error processing audio:", error);
    }
  }

  private async playNextInQueue() {
    if (!this.audioContext || this.isPlaying || this.audioQueue.length === 0) return;

    try {
      this.isPlaying = true;
      this.onPlayingStateChange?.(true);
      const float32Data = this.audioQueue.shift()!;

      // Calculate audio level
      let sum = 0;
      for (let i = 0; i < float32Data.length; i++) {
        sum += Math.abs(float32Data[i]);
      }
      const level = Math.min((sum / float32Data.length) * 100 * 5, 100);
      this.onAudioLevelChange?.(level);

      const audioBuffer = this.audioContext.createBuffer(
        1,
        float32Data.length,
        24000
      );
      audioBuffer.getChannelData(0).set(float32Data);

      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext.destination);
      
      this.currentSource.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
        if (this.audioQueue.length === 0) {
          this.onPlayingStateChange?.(false);
        }
        this.playNextInQueue();
      };

      this.currentSource.start();
    } catch (error) {
      console.error("[WebSocket] Error playing audio:", error);
      this.isPlaying = false;
      this.onPlayingStateChange?.(false);
      this.currentSource = null;
      this.playNextInQueue();
    }
  }

  private async handleMessage(message: string) {
    try {
      const messageData = JSON.parse(message);
      
      if (messageData.setupComplete) {
        console.log("[WebSocket] Setup complete");
        this.isSetupComplete = true;
        this.onSetupCompleteCallback?.();
        return;
      }

      // Handle text responses
      if (messageData.serverContent?.modelTurn?.parts) {
        const parts = messageData.serverContent.modelTurn.parts;
        for (const part of parts) {
          if (part.text) {
            console.log("[WebSocket] Text response:", part.text);
            this.onMessageCallback?.(part.text);
          }
          
          if (part.inlineData?.mimeType === "audio/pcm;rate=24000") {
            console.log("[WebSocket] Audio response received");
            this.playAudioResponse(part.inlineData.data);
          }
        }
      }

      // Handle turn completion
      if (messageData.serverContent?.turnComplete === true) {
        console.log("[WebSocket] Turn complete");
      }
    } catch (error) {
      console.error("[WebSocket] Error parsing message:", error);
    }
  }

  disconnect() {
    console.log("[WebSocket] Disconnecting...");
    this.isSetupComplete = false;
    this.isConnected = false;
    
    this.stopCurrentAudio();
    
    if (this.ws) {
      this.ws.close(1000, "Intentional disconnect");
      this.ws = null;
    }
  }

  private stopCurrentAudio() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.onPlayingStateChange?.(false);
    this.audioQueue = [];
  }
}