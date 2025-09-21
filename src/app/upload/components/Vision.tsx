// src/app/upload/components/Vision.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, Bot, X, Minimize2, Maximize2, FileText, Lightbulb } from 'lucide-react';
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
      console.log('Vision context updated:', {
        previousLength: currentContext.length,
        newLength: analysisContext.length,
        updateCount: contextUpdateCount + 1
      });

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
      
      setTimeout(() => {
        toast.success(
          language === 'swahili' 
            ? 'Vision AI imepata uchambuzi wako mpya!'
            : 'Vision AI has your new analysis ready!',
          { duration: 3000 }
        );
      }, 0);

      if (onContextUpdate) {
        onContextUpdate(analysisContext);
      }
    }
  }, [analysisContext, currentContext, language, onContextUpdate, contextUpdateCount]);

  const toggleMinimized = () => setIsMinimized(prev => !prev);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const getSuggestedQuestions = (): string[] => {
    if (!currentContext) {
      return language === 'swahili' 
        ? [
            'Ninawezaje kuboresha mazao yangu?',
            'Je, kuna magonjwa yoyote katika shamba langu?',
            'Wakati gani mzuri wa kupanda?'
          ]
        : [
            'How can I improve my crop yields?',
            'Are there any diseases in my farm?',
            'When is the best time to plant?'
          ];
    }

    const suggestions: string[] = [];
    
    if (currentContext.toLowerCase().includes('risk')) {
      suggestions.push(
        language === 'swahili' 
          ? 'Ni hatari gani kuu nimezipata?'
          : 'What are the main risks identified?'
      );
    }
    
    if (currentContext.toLowerCase().includes('recommendation') || currentContext.toLowerCase().includes('suggest')) {
      suggestions.push(
        language === 'swahili' 
          ? 'Ni mapendekezo gani ya haraka?'
          : 'What are the immediate recommendations?'
      );
    }
    
    if (currentContext.toLowerCase().includes('schedule') || currentContext.toLowerCase().includes('timing')) {
      suggestions.push(
        language === 'swahili' 
          ? 'Ratiba gani ninafaa kufuata?'
          : 'What schedule should I follow?'
      );
    }

    suggestions.push(
      language === 'swahili' 
        ? 'Niliendelee vipi?'
        : 'How should I proceed?'
    );

    return suggestions.slice(0, 3);
  };

  const sendMessage = async (messageContent?: string) => {
    const messageToSend = messageContent || userInput.trim();
    if (!messageToSend || isLoadingResponse) return;

    console.log('Sending message to Vision:', {
      message: messageToSend,
      hasContext: !!currentContext,
      contextLength: currentContext.length,
      language
    });

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
        ? `ANALYSIS CONTEXT (Use this to answer questions about the farmer's specific situation):\n${currentContext}\n\nUSER QUESTION: ${messageToSend}`
        : messageToSend;

      const response = await fetch('/api/farm-activities/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: enhancedMessage,
          language,
          chatHistory: chatMessages.slice(-8).map(m => ({ 
            role: m.role, 
            content: m.content 
          })),
          hasAnalysisContext: !!currentContext
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.response) {
        throw new Error('Empty response from Vision AI');
      }

      console.log('Vision AI response received:', {
        responseLength: data.response.length,
        hasContext: !!currentContext
      });

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isTyping: true,
        hasContext: !!currentContext
      };

      setChatMessages(prev => [...prev, botMsg]);

      const response_text = data.response;
      for (let i = 0; i <= response_text.length; i++) {
        setChatMessages(prev =>
          prev.map(m =>
            m.id === botMsg.id 
              ? { ...m, content: response_text.slice(0, i) } 
              : m
          )
        );
        await sleep(20);
      }

      setChatMessages(prev =>
        prev.map(m => 
          m.id === botMsg.id 
            ? { ...m, isTyping: false } 
            : m
        )
      );

    } catch (error: any) {
      console.error('Vision AI chat error:', error);

      const errorMessage = language === 'swahili' 
        ? 'Hitilafu! Jaribu tena.' 
        : 'An error occurred. Please try again.';

      setChatError(errorMessage);
      
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: language === 'swahili' 
          ? 'Samahani, kuna hitilafu ya kiufundi. Tafadhali jaribu tena baadaye.' 
          : 'Apologies, a technical error occurred. Please try again later.',
        timestamp: new Date(),
      }]);

      setTimeout(() => {
        toast.error(errorMessage, { duration: 3000 });
      }, 0);
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
    console.log('Chat history cleared');
    setTimeout(() => {
      toast.success(
        language === 'swahili' ? 'Mazungumzo yamefutwa' : 'Chat cleared',
        { duration: 2000 }
      );
    }, 0);
  };

  if (!isOpen) return null;

  const suggestedQuestions = getSuggestedQuestions();

  return (
    <div className={`fixed bottom-4 right-4 z-40 bg-white shadow-lg rounded-lg flex flex-col border border-gray-200 transition-all duration-300 ${
      isMinimized ? 'h-14 w-80' : 'h-[600px] w-96'
    }`}>
      <div className="bg-gray-800 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Bot size={20} />
          <div>
            <span className="font-semibold">Vision AI</span>
            {currentContext && (
              <div className="flex items-center text-gray-300 text-xs mt-0.5">
                <FileText size={12} className="mr-1" />
                <span>Analysis Ready</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {onLanguageToggle && (
            <button 
              onClick={onLanguageToggle} 
              className="p-1 text-gray-300 hover:text-white rounded-md transition-colors text-xs font-medium"
              title="Toggle language"
            >
              {language === 'english' ? 'EN' : 'SW'}
            </button>
          )}
          <button 
            onClick={clearChat}
            className="p-1 text-gray-300 hover:text-white rounded-md transition-colors text-xs"
            title="Clear chat"
          >
            Clear
          </button>
          <button 
            onClick={toggleMinimized}
            className="p-1 text-gray-300 hover:text-white rounded-md transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          {onToggle && (
            <button 
              onClick={onToggle}
              className="p-1 text-gray-300 hover:text-white rounded-md transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 mt-4">
                <div className="mx-auto mb-3 bg-gray-100 p-3 rounded-full w-16 h-16 flex items-center justify-center">
                  <Bot size={28} className="text-gray-600" />
                </div>
                <p className="text-gray-700 text-sm font-medium mb-1">Vision AI Assistant</p>
                <p className="text-xs text-gray-500 mb-4">
                  {language === 'swahili' 
                    ? 'Karibu! Ninawezaje kukusaidia leo?' 
                    : 'How can I assist with your farm analysis?'}
                </p>
                
                {currentContext && (
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4">
                    <div className="flex items-center justify-center text-blue-600 mb-2">
                      <Lightbulb size={16} className="mr-1" />
                      <span className="text-xs font-medium">
                        {language === 'swahili' ? 'Uchambuzi Upo Tayari' : 'Analysis Context Ready'}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600">
                      {language === 'swahili' 
                        ? 'Ninafahamu uchambuzi wako. Uliza chochote!'
                        : 'I have your analysis context. Ask me anything!'}
                    </p>
                  </div>
                )}

                {suggestedQuestions.length > 0 && (
                  <div className="text-left">
                    <p className="text-xs text-gray-600 mb-2 font-medium">
                      {language === 'swahili' ? 'Maswali ya Mfano:' : 'Quick Questions:'}
                    </p>
                    <div className="space-y-2">
                      {suggestedQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => sendMessage(question)}
                          disabled={isLoadingResponse}
                          className="w-full text-left text-xs p-2 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs p-3 rounded-lg break-words relative ${
                    msg.role === 'user' 
                      ? 'bg-gray-800 text-white rounded-br-md' 
                      : `bg-gray-100 text-gray-800 border border-gray-200 rounded-bl-md ${
                          msg.hasContext ? 'border-l-4 border-l-blue-400' : ''
                        }`
                  }`}>
                    {msg.role === 'assistant' && msg.hasContext && (
                      <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        <FileText size={10} />
                      </div>
                    )}
                    
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    
                    {msg.isTyping && (
                      <div className="flex space-x-1 mt-2">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    )}
                    
                    <p className={`text-xs mt-1 text-right ${msg.role === 'user' ? 'text-gray-300' : 'text-gray-500'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {isLoadingResponse && (
              <div className="flex justify-start">
                <div className="bg-gray-100 border border-gray-200 p-3 rounded-lg rounded-bl-md max-w-xs">
                  <div className="flex items-center space-x-2">
                    <Loader2 size={16} className="animate-spin text-gray-600" />
                    <span className="text-xs text-gray-600">
                      {language === 'swahili' ? 'Nafikiri...' : 'Thinking...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {chatError && (
            <div className="mx-4 mt-2 bg-red-50 border border-red-200 p-3 rounded-md flex items-center">
              <AlertCircle size={16} className="text-red-500 mr-2 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-700 text-xs font-medium">Connection Error</p>
                <p className="text-red-600 text-xs">{chatError}</p>
              </div>
              <button
                onClick={() => setChatError(null)}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {currentContext && (
            <div className="mx-4 mt-2 bg-blue-50 border border-blue-100 p-2 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-blue-600">
                  <FileText size={12} className="mr-1" />
                  <span className="text-xs font-medium">
                    {language === 'swahili' ? 'Uchambuzi umepakuliwa' : 'Analysis loaded'}
                  </span>
                </div>
                <span className="text-xs text-blue-500">
                  {Math.round(currentContext.length / 100) / 10}k chars
                </span>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 p-3 bg-white rounded-b-lg">
            <div className="flex space-x-2">
              <textarea
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  currentContext 
                    ? (language === 'swahili' 
                        ? 'Uliza kuhusu uchambuzi wako...' 
                        : 'Ask about your analysis...')
                    : (language === 'swahili' 
                        ? 'Andika swali lako hapa...' 
                        : 'Type your farming question...')
                }
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent min-h-[44px] max-h-32 overflow-y-auto resize-none text-sm placeholder-gray-500 text-gray-800"
                disabled={isLoadingResponse}
                rows={1}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!userInput.trim() || isLoadingResponse}
                className="bg-gray-800 text-white p-2 rounded-lg flex items-center justify-center hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-11 w-11 flex-shrink-0"
                title={language === 'swahili' ? 'Tuma ujumbe' : 'Send message'}
              >
                {isLoadingResponse ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
            
            {suggestedQuestions.length > 0 && chatMessages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {suggestedQuestions.slice(0, 2).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(question)}
                    disabled={isLoadingResponse}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
                  >
                    {question.length > 25 ? question.substring(0, 25) + '...' : question}
                  </button>
                ))}
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-1">
              {language === 'swahili' 
                ? 'Bonyeza Enter kutuma, Shift+Enter mstari mpya'
                : 'Press Enter to send, Shift+Enter for new line'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}