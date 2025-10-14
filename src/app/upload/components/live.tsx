import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Mic, MicOff, Volume2, Eye, VolumeX } from "lucide-react";
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI("AIzaSyCjB4JySK6GSyyJKsW5PZyl5gRqpXOUWsk");

export default function VisionLivePage() {
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
  const [displayedText, setDisplayedText] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const visionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedImageRef = useRef<string>('');
  const speechSynthesisRef = useRef<any>(null);
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Typewriter effect
  useEffect(() => {
    if (geminiResponse) {
      setDisplayedText('');
      let index = 0;
      
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
      }
      
      typewriterIntervalRef.current = setInterval(() => {
        if (index < geminiResponse.length) {
          setDisplayedText(geminiResponse.slice(0, index + 1));
          index++;
        } else {
          if (typewriterIntervalRef.current) {
            clearInterval(typewriterIntervalRef.current);
          }
        }
      }, 30);
      
      return () => {
        if (typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current);
        }
      };
    }
  }, [geminiResponse]);

  // Check TTS support on component mount
  useEffect(() => {
    const ttsSupported = 'speechSynthesis' in window;
    if (!ttsSupported) {
      setTtsEnabled(false);
    } else {
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

  const stopAllSpeech = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
    setIsSpeaking(false);
  };

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

  const getImageHash = (imageData: string): string => {
    return `${imageData.length}-${imageData.substring(100, 150)}`;
  };

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

  const speakText = (text: string) => {
    if (!ttsEnabled || !speechSynthesisRef.current) {
      console.log('TTS disabled or unavailable');
      return;
    }

    setIsSpeaking(true);
    stopAllSpeech();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      const voices = speechSynthesisRef.current.getVoices();
      const voice = voices.find(v => v.lang.includes('en')) || voices[0];
      
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('TTS error:', event.error);
        setIsSpeaking(false);
      };

      // Small delay to prevent synthesis-failed error
      setTimeout(() => {
        if (speechSynthesisRef.current) {
          speechSynthesisRef.current.speak(utterance);
        }
      }, 100);

    } catch (error) {
      console.error('Error with TTS:', error);
      setIsSpeaking(false);
    }
  };

  const toggleTts = () => {
    setTtsEnabled(!ttsEnabled);
    if (ttsEnabled) {
      stopAllSpeech();
    }
  };

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
            width: 1280, 
            height: 720,
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

  const toggleContinuousVision = () => {
    if (isContinuousVision) {
      stopContinuousVision();
      setIsContinuousVision(false);
    } else {
      startContinuousVision();
      setIsContinuousVision(true);
    }
  };

  const handleManualInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      processUserInput(e.currentTarget.value);
      e.currentTarget.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Video Background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {!isStreaming && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-white text-center">
            <VideoOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl mb-2">Camera is off</p>
            <p className="text-sm opacity-75">Click Live to start</p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Vision</h1>
          
          <div className="flex items-center gap-3">
            {isListening && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-full border border-red-500/50">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-medium">Listening</span>
              </div>
            )}
            
            {isContinuousVision && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/50">
                <Eye className="h-4 w-4 text-green-400" />
                <span className="text-white text-sm font-medium">Watching</span>
              </div>
            )}
            
            <Button
              onClick={toggleCamera}
              className={`px-6 py-3 rounded-full font-semibold text-lg ${
                isStreaming 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isStreaming ? 'Stop' : 'Live'}
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Overlay */}
      {isStreaming && conversation.length > 0 && (
        <div className="absolute top-24 left-6 right-6 max-w-2xl pointer-events-none z-20">
          <div className="space-y-3">
            {conversation.slice(-3).map((msg, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 animate-in slide-in-from-left duration-300 ${
                  msg.role === 'user' ? 'justify-start' : 'justify-start'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex-shrink-0 overflow-hidden ${
                  msg.role === 'assistant' && isSpeaking && index === conversation.slice(-3).length - 1
                    ? 'ring-4 ring-green-400 ring-opacity-75 animate-pulse'
                    : 'ring-2 ring-white/30'
                }`}>
                  <img 
                    src="/avatar.png" 
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className={`px-4 py-3 rounded-2xl max-w-md backdrop-blur-md ${
                  msg.role === 'user'
                    ? 'bg-blue-500/90 text-white'
                    : 'bg-black/70 text-white'
                }`}>
                  <p className="text-sm font-medium mb-1">
                    {msg.role === 'user' ? 'You' : 'Vision AI'}
                  </p>
                  <p className="text-base leading-relaxed">
                    {msg.role === 'assistant' && index === conversation.slice(-3).length - 1
                      ? displayedText
                      : msg.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcript Display */}
      {isListening && transcript && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
            <p className="text-white text-sm">"{transcript}"</p>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              onClick={toggleListening}
              disabled={!isStreaming}
              size="icon"
              className={`w-14 h-14 rounded-full ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-white/20 hover:bg-white/30 backdrop-blur-md'
              }`}
            >
              {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>

            <Button
              onClick={toggleContinuousVision}
              disabled={!isStreaming}
              size="icon"
              className={`w-14 h-14 rounded-full ${
                isContinuousVision 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-white/20 hover:bg-white/30 backdrop-blur-md'
              }`}
            >
              <Eye className="h-6 w-6" />
            </Button>

            <Button
              onClick={toggleTts}
              size="icon"
              className={`w-14 h-14 rounded-full ${
                ttsEnabled 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-white/20 hover:bg-white/30 backdrop-blur-md'
              }`}
            >
              {ttsEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
            </Button>
          </div>

          <div className="max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Type your message..."
              onKeyPress={handleManualInput}
              className="w-full px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              disabled={!isStreaming || isProcessing}
            />
          </div>

          {isProcessing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-white">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Processing...</span>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}