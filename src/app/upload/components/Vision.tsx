'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, Bot, Globe, Play, Pause } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

// Helper for typewriter sleep
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function VisionPage() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [language, setLanguage] = useState<'english' | 'swahili'>('english');

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Toggle language
  const toggleLanguage = () => setLanguage(prev => (prev === 'english' ? 'swahili' : 'english'));

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

  return (
    <div className="flex justify-center items-center h-screen bg-gray-50 p-4">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg flex flex-col h-[80vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 flex justify-between items-center px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Bot size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">Vision AI Assistant</h1>
              <p className="text-xs text-gray-500">Agricultural intelligence platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleLanguage} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-md border border-gray-300 hover:border-gray-400 transition-all text-sm"
            >
              <Globe size={16} />
              <span>{language === 'english' ? 'EN' : 'SW'}</span>
            </button>
            <button 
              onClick={() => setIsChatMinimized(!isChatMinimized)} 
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              {isChatMinimized ? <Play size={18} /> : <Pause size={18} />}
            </button>
          </div>
        </div>

        {/* Chat */}
        {!isChatMinimized && (
          <>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  <div className="mx-auto mb-4 bg-blue-50 p-4 rounded-full w-16 h-16 flex items-center justify-center">
                    <Bot size={32} className="text-blue-600" />
                  </div>
                  <p className="text-gray-600 mb-1">Vision </p>
                  <p className="text-sm text-gray-500">{language === 'swahili' ? 'Karibu! Ninawezaje kukusaidia leo?' : 'Talk to Vision and get insights Today'}</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md p-4 rounded-lg break-words ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-md' 
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 text-right ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {isLoadingResponse && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 p-4 rounded-lg rounded-bl-md max-w-xs">
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
              <div className="mx-6 mt-2 bg-red-50 border border-red-200 p-3 rounded-md flex items-center">
                <AlertCircle size={16} className="text-red-500 mr-2 flex-shrink-0" />
                <p className="text-red-700 text-sm">{chatError}</p>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white">
              <div className="flex space-x-3">
                <textarea
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={language === 'swahili' ? 'Andika swali lako hapa...' : 'Type your question here...'}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] max-h-32 overflow-y-auto resize-none text-sm"
                  disabled={isLoadingResponse}
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!userInput.trim() || isLoadingResponse}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors h-11 w-11 flex-shrink-0"
                >
                  {isLoadingResponse ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {language === 'swahili' ? 'Bonyeza Enter kutuma, Shift+Enter kwa mstari mpya' : 'Press Enter to send, Shift+Enter for new line'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}