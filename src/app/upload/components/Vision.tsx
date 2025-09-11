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
      setChatError(language === 'swahili' ? 'Hitilafu! Jaribu tena.' : 'Oops! Something went wrong.');
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: language === 'swahili' ? 'Pole, nimekumbana na hitilafu. Jaribu baadae.' : 'Sorry, I hit a snag. Try again later.',
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
    <div className="flex justify-center items-center h-screen bg-gradient-to-r from-green-100 via-green-50 to-green-100 p-4">
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-3xl flex flex-col h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white flex justify-between items-center px-6 py-4 rounded-t-3xl">
          <div className="flex items-center space-x-2">
            <Bot size={28} />
            <h1 className="text-2xl font-bold tracking-wide">Vision AI 🌱</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={toggleLanguage} className="flex items-center gap-1 bg-green-500/20 hover:bg-green-500/30 px-2 py-1 rounded-full transition">
              <Globe size={18} />
              <span className="text-sm">{language === 'english' ? 'EN' : 'SW'}</span>
            </button>
            <button onClick={() => setIsChatMinimized(!isChatMinimized)} className="p-1 rounded-full hover:bg-green-500/20 transition">
              {isChatMinimized ? <Play size={20} /> : <Pause size={20} />}
            </button>
          </div>
        </div>

        {/* Chat */}
        {!isChatMinimized && (
          <>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  <Bot size={48} className="mx-auto text-green-400 mb-3" />
                  <p className="text-lg">{language === 'swahili' ? 'Habari! Mimi ni Vision, AI yako ya kilimo. Tunaonaje?' : 'Hi there! I\'m Vision, your farming AI. What\'s up?'}</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md p-4 rounded-2xl break-words ${
                      msg.role === 'user' ? 'bg-green-100 text-green-900 rounded-br-none' : 'bg-blue-100 text-blue-900 rounded-bl-none'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1 text-right">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))
              )}
              {isLoadingResponse && (
                <div className="flex justify-start">
                  <div className="bg-blue-100 text-blue-900 p-4 rounded-2xl rounded-bl-none max-w-xs">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-400"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {chatError && (
              <div className="bg-red-50 border border-red-200 p-3 mx-6 rounded-lg flex items-center">
                <AlertCircle size={16} className="text-red-500 mr-2" />
                <p className="text-red-700 text-sm">{chatError}</p>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white flex flex-col">
              <div className="flex space-x-2">
                <textarea
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={language === 'swahili' ? 'Andika hapa...' : 'Type your question...'}
                  className="flex-1 border border-gray-300 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[40px] max-h-32 overflow-y-auto resize-none"
                  disabled={isLoadingResponse}
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!userInput.trim() || isLoadingResponse}
                  className="bg-green-600 text-white px-4 py-2 rounded-2xl flex items-center justify-center hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {isLoadingResponse ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">{language === 'swahili' ? 'Enter kutuma, Shift+Enter kwa mstari mpya' : 'Press Enter to send, Shift+Enter for new line'}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
