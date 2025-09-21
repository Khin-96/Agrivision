// src/app/upload/components/Vision.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, Bot, Globe, X, Minimize2, Maximize2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface VisionProps {
  analysisResults?: any[];
  language?: 'english' | 'swahili';
  onLanguageToggle?: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

// Helper for typewriter sleep
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function Vision({ 
  analysisResults = [], 
  language = 'english', 
  onLanguageToggle,
  isOpen = true,
  onToggle 
}: VisionProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Toggle minimized state
  const toggleMinimized = () => setIsMinimized(prev => !prev);

  // Auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Send message
  const sendMessage = async () => {
    if (!userInput.trim() || isLoadingResponse) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput.trim(),
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, newMsg]);
    const inputCopy = userInput.trim();
    setUserInput('');
    setIsLoadingResponse(true);
    setChatError(null);

    try {
      const response = await fetch('/api/farm-activities/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputCopy,
          language,
          chatHistory: chatMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();

      // Add bot message empty first for typewriter
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isTyping: true,
      };
      setChatMessages(prev => [...prev, botMsg]);

      // Typewriter effect
      for (let i = 0; i <= data.response.length; i++) {
        setChatMessages(prev =>
          prev.map(m =>
            m.id === botMsg.id ? { ...m, content: data.response.slice(0, i) } : m
          )
        );
        await sleep(25);
      }

      // Done typing
      setChatMessages(prev =>
        prev.map(m => (m.id === botMsg.id ? { ...m, isTyping: false } : m))
      );

    } catch (error: any) {
      console.error(error);
      setChatError(language === 'swahili' ? 'Hitilafu! Jaribu tena.' : 'An error occurred. Please try again.');
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: language === 'swahili' ? 'Samahani, kuna hitilafu ya kiufundi. Tafadhali jaribu tena baadaye.' : 'Apologies, a technical error occurred. Please try again later.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-40 bg-white shadow-xl rounded-lg flex flex-col border border-gray-200 transition-all duration-300 ${
      isMinimized ? 'h-14 w-80' : 'h-[500px] w-96'
    }`}>
      {/* Header */}
      <div className="bg-green-700 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Bot size={20} />
          <span className="font-semibold">Vision AI Assistant</span>
        </div>
        <div className="flex items-center space-x-2">
          {onLanguageToggle && (
            <button 
              onClick={onLanguageToggle} 
              className="p-1 text-green-100 hover:text-white rounded-md transition-colors text-xs"
              title="Toggle language"
            >
              {language === 'english' ? 'EN' : 'SW'}
            </button>
          )}
          <button 
            onClick={toggleMinimized}
            className="p-1 text-green-100 hover:text-white rounded-md transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          {onToggle && (
            <button 
              onClick={onToggle}
              className="p-1 text-green-100 hover:text-white rounded-md transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 mt-4">
                <div className="mx-auto mb-2 bg-green-100 p-2 rounded-full w-12 h-12 flex items-center justify-center">
                  <Bot size={24} className="text-green-600" />
                </div>
                <p className="text-green-700 text-sm font-medium mb-1">Vision Assistant</p>
                <p className="text-xs text-gray-500">{language === 'swahili' ? 'Karibu! Ninawezaje kukusaidia leo?' : 'How can I assist with your farm analysis?'}</p>
              </div>
            ) : (
              chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs p-3 rounded-lg break-words ${
                    msg.role === 'user' 
                      ? 'bg-green-600 text-white rounded-br-md' 
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 text-right ${msg.role === 'user' ? 'text-green-100' : 'text-gray-500'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoadingResponse && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-bl-md max-w-xs">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {chatError && (
            <div className="mx-4 mt-2 bg-red-50 border border-red-200 p-2 rounded-md flex items-center">
              <AlertCircle size={14} className="text-red-500 mr-2 flex-shrink-0" />
              <p className="text-red-700 text-xs">{chatError}</p>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="flex space-x-2">
              <textarea
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={language === 'swahili' ? 'Andika swali lako hapa...' : 'Ask about your analysis...'}
                className="flex-1 border border-green-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px] max-h-32 overflow-y-auto resize-none text-sm placeholder-green-500"
                disabled={isLoadingResponse}
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={!userInput.trim() || isLoadingResponse}
                className="bg-green-600 text-white p-2 rounded-lg flex items-center justify-center hover:bg-green-700 disabled:opacity-50 transition-colors h-10 w-10 flex-shrink-0"
              >
                {isLoadingResponse ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}