// app/talking-gemini/page.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Mic, MicOff, Volume2, MessageCircle, Eye, VolumeX } from "lucide-react";
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI("AIzaSyCjB4JySK6GSyyJKsW5PZyl5gRqpXOUWsk");

export default function TalkingGeminiPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [geminiResponse, setGeminiResponse] = useState('');
  const [conversation, setConversation] = useState<Array<{role: string, text: string}>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContinuousVision, setIsContinuousVision] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsError, setTtsError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const visionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedImageRef = useRef<string>('');
  const speechSynthesisRef = useRef<any>(null);

  // Check TTS support on component mount
  useEffect(() => {
    const ttsSupported = 'speechSynthesis' in window;
    if (!ttsSupported) {
      setTtsError('Text-to-speech not supported in this browser');
      setTtsEnabled(false);
    } else {
      // Preload voices
      speechSynthesisRef.current = window.speechSynthesis;
      const voices = speechSynthesisRef.current.getVoices();
      if (voices.length === 0) {
        speechSynthesisRef.current.onvoiceschanged = () => {
          console.log('Voices loaded:', speechSynthesisRef.current.getVoices().length);
        };
      }
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(interimTranscript || finalTranscript);

        // If we have a final transcript and it's not empty, process it
        if (finalTranscript.trim()) {
          processUserInput(finalTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          setTimeout(() => {
            if (isListening && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error);
        if (isListening) {
          setTimeout(() => {
            if (isListening && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 1000);
        }
      };
    } else {
      console.log('Speech recognition not supported');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopContinuousVision();
      stopAllSpeech();
    };
  }, [isListening]);

  // Stop all speech
  const stopAllSpeech = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  // Capture image from camera
  const captureImage = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || !video.videoWidth || !video.videoHeight) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.7);
  };

  // Get image hash for change detection
  const getImageHash = (imageData: string): string => {
    return `${imageData.length}-${imageData.substring(100, 150)}`;
  };

  // Continuous vision processing
  const startContinuousVision = () => {
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
    }

    visionIntervalRef.current = setInterval(async () => {
      if (!isStreaming || isProcessing || isSpeaking) return;

      const imageData = captureImage();
      if (!imageData) return;

      const currentHash = getImageHash(imageData);
      
      if (currentHash !== lastProcessedImageRef.current) {
        lastProcessedImageRef.current = currentHash;
        await processVisualUpdate(imageData);
      }
    }, 3000);
  };

  const stopContinuousVision = () => {
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
  };

  // Process visual updates
  const processVisualUpdate = async (imageData: string) => {
    if (isProcessing || isSpeaking) return;

    setIsProcessing(true);
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `You are an observant AI assistant watching through a camera. Look at the current image and describe any significant changes, new objects, or interesting things you notice. Be concise (1 sentence max). Only mention things that are actually visible and noteworthy. If nothing significant has changed, don't respond.`;

      const base64Data = imageData.split(',')[1];
      
      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        }
      ]);

      const response = await result.response;
      const responseText = response.text().trim();

      if (responseText && !responseText.includes("don't see") && !responseText.includes("nothing") && responseText.length > 10) {
        const visualMessage = { role: 'assistant', text: responseText };
        setConversation(prev => [...prev, visualMessage]);
        setGeminiResponse(responseText);
        speakText(responseText);
      }

    } catch (error) {
      console.error('Error processing visual update:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process user input
  const processUserInput = async (userInput: string) => {
    if (!userInput.trim() || isProcessing) return;

    setIsProcessing(true);
    
    const userMessage = { role: 'user', text: userInput };
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    setTranscript('');

    try {
      const imageData = captureImage();
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const recentMessages = updatedConversation.slice(-4);
      const history = recentMessages.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
      ).join('\n');

      const prompt = `You are a friendly, conversational AI assistant that can see through a camera. 

Recent conversation:
${history}

What you see in the current camera image: [Describe what you see - people, objects, environment, actions]

User just said: "${userInput}"

Respond naturally and conversationally. If you see something interesting, mention it. Keep response under 2 sentences. Be engaging and friendly.`;

      let result;
      if (imageData) {
        const base64Data = imageData.split(',')[1];
        
        result = await model.generateContent([
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          }
        ]);
      } else {
        result = await model.generateContent(prompt);
      }

      const response = await result.response;
      const responseText = response.text();

      const assistantMessage = { role: 'assistant', text: responseText };
      const finalConversation = [...updatedConversation, assistantMessage];
      setConversation(finalConversation);
      setGeminiResponse(responseText);

      speakText(responseText);

    } catch (error) {
      console.error('Error processing with Gemini:', error);
      const errorResponse = "I apologize, but I'm having trouble processing that right now. Please try again.";
      const errorMessage = { role: 'assistant', text: errorResponse };
      setGeminiResponse(errorResponse);
      setConversation(prev => [...prev, errorMessage]);
      speakText(errorResponse);
    } finally {
      setIsProcessing(false);
    }
  };

  // ROBUST Text-to-speech function with multiple fallbacks
  const speakText = (text: string) => {
    if (!ttsEnabled) {
      console.log('TTS disabled. Would have said:', text);
      return;
    }

    setIsSpeaking(true);
    setTtsError('');

    // Stop any current speech
    stopAllSpeech();

    // Method 1: Try native SpeechSynthesis first
    if (speechSynthesisRef.current) {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure utterance
        utterance.rate = 0.9; // Slower for better comprehension
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        // Try to get a good voice
        const voices = speechSynthesisRef.current.getVoices();
        const preferredVoices = [
          'Google US English',
          'Microsoft David - English (United States)',
          'Alex',
          'Samantha'
        ];
        
        const voice = voices.find(v => preferredVoices.some(p => v.name.includes(p))) || 
                     voices.find(v => v.lang.includes('en')) || 
                     voices[0];
        
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onend = () => {
          setIsSpeaking(false);
          setTtsError('');
        };

        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          setIsSpeaking(false);
          setTtsError(`TTS failed: ${event.error}`);
          
          // Fallback to method 2
          attemptTtsFallback(text);
        };

        // Add a timeout for speech synthesis
        const speechTimeout = setTimeout(() => {
          if (isSpeaking) {
            speechSynthesisRef.current.cancel();
            setIsSpeaking(false);
            setTtsError('TTS timeout');
            attemptTtsFallback(text);
          }
        }, 10000); // 10 second timeout

        utterance.onend = () => {
          clearTimeout(speechTimeout);
          setIsSpeaking(false);
          setTtsError('');
        };

        speechSynthesisRef.current.speak(utterance);
        return;

      } catch (error) {
        console.error('Error with native TTS:', error);
        setTtsError('Native TTS failed');
      }
    }

    // Fallback methods
    attemptTtsFallback(text);
  };

  // Fallback TTS methods
  const attemptTtsFallback = (text: string) => {
    // Method 2: Try Web Speech API with different approach
    try {
      // Create a new utterance with minimal settings
      const utterance = new SpeechSynthesisUtterance(text.substring(0, 200)); // Limit length
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        // Method 3: Browser audio fallback (beep pattern)
        attemptAudioFallback();
      };

      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.speak(utterance);
      } else {
        attemptAudioFallback();
      }
    } catch (error) {
      console.error('Fallback TTS failed:', error);
      attemptAudioFallback();
    }
  };

  // Final fallback - audio cues
  const attemptAudioFallback = () => {
    setIsSpeaking(false);
    setTtsError('Text-to-speech unavailable. Enable browser TTS or check permissions.');
    
    // Visual alert as final fallback
    if (geminiResponse) {
      // Create a temporary visual notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fef3cd;
        border: 1px solid #f59e0b;
        padding: 12px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      `;
      notification.innerHTML = `
        <strong>🔊 Gemini Says:</strong><br>
        ${geminiResponse}
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 5000);
    }
  };

  // Toggle TTS on/off
  const toggleTts = () => {
    setTtsEnabled(!ttsEnabled);
    if (!ttsEnabled) {
      setTtsError('');
    } else {
      stopAllSpeech();
    }
  };

  // Start/stop camera
  const toggleCamera = async () => {
    if (isStreaming && streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsStreaming(false);
      stopListening();
      stopContinuousVision();
      stopAllSpeech();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          },
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = resolve;
            }
          });
        }
        
        streamRef.current = stream;
        setIsStreaming(true);
        
        startListening();
        setIsContinuousVision(true);
        startContinuousVision();
        
        setTimeout(() => {
          autoGreet();
        }, 1000);
        
      } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Could not access camera. Please make sure you have given camera and microphone permissions.');
      }
    }
  };

  // Auto-greet when camera starts
  const autoGreet = async () => {
    const imageData = captureImage();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `You are a friendly AI assistant that can see through a camera. Look at the image and give a friendly, welcoming greeting to the person you see. Mention something you notice about them or their environment to make it personal. Keep it to 1-2 sentences maximum. Be warm and engaging.`;

    try {
      let result;
      if (imageData) {
        const base64Data = imageData.split(',')[1];
        result = await model.generateContent([
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          }
        ]);
      } else {
        result = await model.generateContent(prompt);
      }

      const response = await result.response;
      const greeting = response.text();

      setGeminiResponse(greeting);
      setConversation([{ role: 'assistant', text: greeting }]);
      speakText(greeting);

    } catch (error) {
      console.error('Error with auto-greet:', error);
      const fallbackGreeting = "Hello there! I can see you through the camera. How can I help you today?";
      setGeminiResponse(fallbackGreeting);
      setConversation([{ role: 'assistant', text: fallbackGreeting }]);
      speakText(fallbackGreeting);
    }
  };

  // Start/stop speech recognition
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.log('Error starting speech recognition:', error);
        setTimeout(() => {
          if (!isListening && recognitionRef.current) {
            recognitionRef.current.start();
          }
        }, 500);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setTranscript('');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Toggle continuous vision
  const toggleContinuousVision = () => {
    if (isContinuousVision) {
      stopContinuousVision();
      setIsContinuousVision(false);
    } else {
      startContinuousVision();
      setIsContinuousVision(true);
    }
  };

  // Manual input
  const handleManualInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      processUserInput(e.currentTarget.value);
      e.currentTarget.value = '';
    }
  };

  // Quick action buttons
  const quickActions = [
    { label: "What do you see?", prompt: "What can you see in the camera right now?" },
    { label: "Describe me", prompt: "Can you describe what I look like?" },
    { label: "Tell a joke", prompt: "Tell me a short joke about what you see" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MessageCircle className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              Talking Gemini AI
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start the camera and talk naturally. Gemini will see through your camera and respond with voice!
          </p>
        </div>

        {/* Camera Preview */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 bg-gray-200 rounded-lg object-cover"
              />
              {!isStreaming && (
                <div className="absolute inset-0 bg-gray-800 rounded-lg flex items-center justify-center">
                  <div className="text-white text-center">
                    <VideoOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Camera is off</p>
                    <p className="text-sm opacity-75 mt-1">Click the button below to start</p>
                  </div>
                </div>
              )}
              
              <Button
                onClick={toggleCamera}
                size="icon"
                className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-full w-12 h-12 ${
                  isStreaming 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isStreaming ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4 justify-center mb-4 flex-wrap">
              <Button
                onClick={toggleListening}
                disabled={!isStreaming}
                variant={isListening ? "destructive" : "default"}
                className="flex items-center gap-2"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isListening ? 'Stop Listening' : 'Start Listening'}
              </Button>

              <Button
                onClick={toggleContinuousVision}
                disabled={!isStreaming}
                variant={isContinuousVision ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                {isContinuousVision ? 'Watching' : 'Watch'}
              </Button>

              <Button
                onClick={toggleTts}
                variant={ttsEnabled ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                TTS {ttsEnabled ? 'On' : 'Off'}
              </Button>

              <Button
                onClick={() => speakText(geminiResponse)}
                disabled={!geminiResponse || isSpeaking || !ttsEnabled}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Volume2 className="h-4 w-4" />
                Repeat
              </Button>
            </div>

            {/* TTS Error */}
            {ttsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{ttsError}</p>
                <p className="text-red-600 text-xs mt-1">
                  Check browser permissions for text-to-speech or try a different browser.
                </p>
              </div>
            )}

            {/* Status Indicators */}
            <div className="flex justify-center gap-4 mb-4 text-sm">
              {isListening && (
                <div className="flex items-center gap-1 text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  Listening
                </div>
              )}
              {isContinuousVision && (
                <div className="flex items-center gap-1 text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                  Watching
                </div>
              )}
              {isSpeaking && (
                <div className="flex items-center gap-1 text-purple-600">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                  Speaking
                </div>
              )}
              {!ttsEnabled && (
                <div className="flex items-center gap-1 text-gray-600">
                  <VolumeX className="h-3 w-3" />
                  TTS Off
                </div>
              )}
            </div>

            {/* Speech recognition status */}
            {isListening && transcript && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-800">Heard: "{transcript}"</span>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2 text-center">Quick actions:</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={() => processUserInput(action.prompt)}
                    disabled={!isStreaming || isProcessing}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Manual input */}
            <div className="mt-4">
              <input
                type="text"
                placeholder="Or type your message here and press Enter..."
                onKeyPress={handleManualInput}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isStreaming || isProcessing}
              />
            </div>

            {/* Processing indicator */}
            {isProcessing && (
              <div className="mt-3 flex items-center justify-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Gemini is thinking...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Response */}
        {geminiResponse && (
          <Card className={`mb-6 ${isSpeaking ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="font-semibold text-green-800">
                  {isSpeaking ? '🎤 Gemini is speaking...' : '💬 Gemini says:'}
                </span>
              </div>
              <p className="text-gray-800 text-lg">{geminiResponse}</p>
              {!ttsEnabled && (
                <p className="text-sm text-gray-500 mt-2">
                  🔇 Text-to-speech is disabled. Enable TTS to hear responses.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Conversation History */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversation
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'bg-green-50 border border-green-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {msg.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">
                        {msg.role === 'user' ? 'You' : 'Gemini'}
                      </p>
                      <p className="text-gray-800">{msg.text}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {conversation.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg mb-2">No conversation yet</p>
                  <p className="text-sm">Start the camera and begin talking!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>💡 <strong>Tip:</strong> Make sure you allow microphone and camera permissions when prompted</p>
          <p className="mt-1">🎤 Speak naturally - no need to press any buttons while talking</p>
          <p className="mt-1">👁️ Enable "Watch" mode for Gemini to comment on visual changes automatically</p>
          {ttsError && (
            <p className="mt-1 text-red-600">
              🔇 TTS Issue: {ttsError}. Try enabling browser text-to-speech permissions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}