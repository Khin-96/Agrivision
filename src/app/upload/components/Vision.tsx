'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Send, Loader2, X, Minimize2, Maximize2, Bot } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  hasContext?: boolean;
}

interface VisionProps {
  analysisResults?: any[];
  language?: 'english' | 'swahili';
  onLanguageToggle?: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
  analysisContext?: string;
  onContextUpdate?: (context: string) => void;
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function Vision({ 
  analysisResults = [], 
  language = 'english', 
  onLanguageToggle,
  isOpen = true,
  onToggle,
  analysisContext = '',
  onContextUpdate
}: VisionProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentContext, setCurrentContext] = useState<string>(analysisContext);
  const [contextUpdateCount, setContextUpdateCount] = useState(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (analysisContext && analysisContext !== currentContext) {
      setCurrentContext(analysisContext);
      setContextUpdateCount(prev => prev + 1);

      const contextMessage: ChatMessage = {
        id: `context-${Date.now()}`,
        role: 'assistant',
        content: language === 'swahili' 
          ? `📊 Nimepokea uchambuzi mpya wa mazao yako! Unaweza kuniuliza maswali yoyote kuhusu matokeo haya.`
          : `📊 I've received your fresh farm analysis! Feel free to ask me anything about the results.`,
        timestamp: new Date(),
        hasContext: true
      };

      setChatMessages(prev => [...prev, contextMessage]);
      toast.success(
        language === 'swahili' 
          ? 'Vision AI imepata uchambuzi wako mpya!'
          : 'Vision AI has your new analysis ready!',
        { duration: 3000 }
      );

      if (onContextUpdate) onContextUpdate(analysisContext);
    }
  }, [analysisContext, currentContext, language, onContextUpdate, contextUpdateCount]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const toggleMinimized = () => setIsMinimized(prev => !prev);

  const getSuggestedQuestions = (): string[] => {
    if (!currentContext) {
      return language === 'swahili' 
        ? ['Ninawezaje kuboresha mazao yangu?', 'Je, kuna magonjwa yoyote katika shamba langu?', 'Wakati gani mzuri wa kupanda?']
        : ['How can I improve my crop yields?', 'Are there any diseases in my farm?', 'When is the best time to plant?'];
    }

    const suggestions: string[] = [];
    const lcContext = currentContext.toLowerCase();

    if (lcContext.includes('risk')) suggestions.push(language === 'swahili' ? 'Ni hatari gani kuu nimezipata?' : 'What are the main risks identified?');
    if (lcContext.includes('recommendation') || lcContext.includes('suggest')) suggestions.push(language === 'swahili' ? 'Ni mapendekezo gani ya haraka?' : 'What are the immediate recommendations?');
    if (lcContext.includes('schedule') || lcContext.includes('timing')) suggestions.push(language === 'swahili' ? 'Ratiba gani ninafaa kufuata?' : 'What schedule should I follow?');

    suggestions.push(language === 'swahili' ? 'Niliendelee vipi?' : 'How should I proceed?');
    return suggestions.slice(0, 3);
  };

  const sendMessage = async (messageContent?: string) => {
    const messageToSend = messageContent || userInput.trim();
    if (!messageToSend || isLoadingResponse) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, newMsg]);
    if (!messageContent) setUserInput('');
    setIsLoadingResponse(true);
    setChatError(null);

    try {
      const enhancedMessage = currentContext 
        ? `ANALYSIS CONTEXT:\n${currentContext}\n\nUSER QUESTION: ${messageToSend}`
        : messageToSend;

      const response = await fetch('/api/farm-activities/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: enhancedMessage,
          language,
          chatHistory: chatMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
          hasAnalysisContext: !!currentContext
        }),
      });

      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      if (!data.response) throw new Error('Empty response');

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isTyping: true,
        hasContext: !!currentContext
      };
      setChatMessages(prev => [...prev, botMsg]);

      for (let i = 0; i <= data.response.length; i++) {
        setChatMessages(prev =>
          prev.map(m => m.id === botMsg.id ? { ...m, content: data.response.slice(0, i) } : m)
        );
        await sleep(20);
      }

      setChatMessages(prev => prev.map(m => m.id === botMsg.id ? { ...m, isTyping: false } : m));
    } catch (error) {
      setChatError(language === 'swahili' ? 'Hitilafu! Jaribu tena.' : 'An error occurred. Please try again.');
      toast.error(language === 'swahili' ? 'Hitilafu! Jaribu tena.' : 'An error occurred. Please try again.', { duration: 3000 });
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

  const clearChat = () => {
    setChatMessages([]);
    setChatError(null);
    toast.success(language === 'swahili' ? 'Mazungumzo yamefutwa' : 'Chat cleared', { duration: 2000 });
  };

  if (!isOpen) return null;

  const suggestedQuestions = getSuggestedQuestions();

  return (
    <div
      className={`fixed right-6 z-50 flex flex-col border border-gray-200 shadow-2xl bg-white transition-all duration-300`}
      style={{
        bottom: '80px', // Adjust to navbar height
        width: '384px',
        height: 'calc(100vh - 80px)'
      }}
    >
      {/* Header */}
      {!isMinimized && (
        <div className="bg-green-800 text-white px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Bot size={20} />
            <span className="font-semibold">Vision AI</span>
          </div>
          <div className="flex items-center space-x-2">
            {onLanguageToggle && (
              <button onClick={onLanguageToggle} className="p-1 text-white hover:text-gray-200 rounded-md text-xs font-medium">
                {language === 'english' ? 'EN' : 'SW'}
              </button>
            )}
            <button onClick={clearChat} className="p-1 text-white hover:text-gray-200 rounded-md text-xs">Clear</button>
            <button onClick={toggleMinimized} className="p-1 text-white hover:text-gray-200 rounded-md">
              <Minimize2 size={16} />
            </button>
            {onToggle && <button onClick={onToggle} className="p-1 text-white hover:text-gray-200 rounded-md"><X size={16} /></button>}
          </div>
        </div>
      )}

      {/* Minimized avatar */}
      {isMinimized && (
        <div className="flex justify-center items-center bg-white border-t border-gray-200 p-1">
          <button onClick={toggleMinimized} className="focus:outline-none">
            <Image src="/avatar.png" alt="Vision AI" width={48} height={48} className="rounded-full" />
          </button>
        </div>
      )}

      {/* Chat */}
      {!isMinimized && (
        <>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-700">
                <div className="mb-3 w-20 h-20 relative">
                  <Image src="/avatar.png" alt="Vision AI" fill className="rounded-full object-cover" />
                </div>
                <p className="font-medium">{language === 'swahili' ? 'Karibu! Ninawezaje kukusaidia leo?' : 'Hello! How can I assist your farm analysis?'}</p>
                {suggestedQuestions.length > 0 && (
                  <div className="mt-4 flex flex-col space-y-2">
                    {suggestedQuestions.map((q, i) => (
                      <button key={i} onClick={() => sendMessage(q)} className="px-3 py-1 bg-green-50 text-green-800 text-xs rounded-lg hover:bg-green-100">{q}</button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs p-3 break-words relative ${
                    msg.role === 'user' ? 'bg-green-800 text-white rounded-br-md' : 'bg-green-50 text-green-900 border border-green-200 rounded-bl-md'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.isTyping && (
                      <div className="flex space-x-1 mt-2">
                        <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    )}
                    <p className="text-xs mt-1 text-right">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="border-t border-green-200 p-3 flex space-x-2">
            <textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={currentContext ? (language === 'swahili' ? 'Uliza kuhusu uchambuzi wako...' : 'Ask about your analysis...') : (language === 'swahili' ? 'Andika swali lako hapa...' : 'Type your question...')}
              className="flex-1 border border-green-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm placeholder-green-400 text-green-900 min-h-[44px] resize-none overflow-y-auto"
              disabled={isLoadingResponse}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!userInput.trim() || isLoadingResponse}
              className="bg-green-800 text-white p-2 flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed h-11 w-11 rounded-lg"
            >
              {isLoadingResponse ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
