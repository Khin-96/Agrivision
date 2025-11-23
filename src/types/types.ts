export interface TTSVoice {
  name: string;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  text?: string;
  enabled?: boolean;
  voice?: string;
  answer?: string;
  error?: string;
  audio_data?: string;
  mime_type?: string;
  source?: string;
  has_frame?: boolean;
  frame_data?: string;
  is_response?: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
}

export interface VoiceSettings {
  enabled: boolean;
  useGeminiTTS: boolean;
  selectedVoice: string;
  listeningMode: boolean;
}

export interface ConversationHistory {
  user: string;
  vision: string;
  timestamp: Date;
}
