// app/Monitor-Farm/component/chatWidget.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X, Upload, Loader2, Camera, AlertCircle, CheckCircle } from 'lucide-react';

// TypeScript interfaces for the chat system
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
  analysis?: GeminiAnalysisResult;
}

interface GeminiAnalysisResult {
  analysis: string;
  recommendations: string[];
  personalizedSchedule: {
    timeframe: string;
    tasks: string[];
  }[];
  risks: string[];
  didYouKnow: string;
  confidence: number;
}

interface ChatWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  apiEndpoint?: string;
}

/**
 * ChatWidget - A floating AI-powered chat assistant for farm management
 * 
 * Features:
 * - Text and image input support
 * - Structured AI responses with analysis, recommendations, schedule, risks
 * - Scrollable chat history
 * - Loading states and error handling
 * - Fully responsive design
 * - TypeScript support
 */
export default function ChatWidget({ 
  className = '', 
  position = 'bottom-right',
  apiEndpoint = '/api/farmbot'
}: ChatWidgetProps) {
  // State management for chat functionality
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Refs for DOM manipulation
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  /**
   * Generate unique ID for messages
   */
  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Get position classes for the chat widget
   */
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      default:
        return 'bottom-4 right-4';
    }
  };

  /**
   * Send text message to the AI farmbot
   */
  const sendTextMessage = async (content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: generateId(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    try {
      // Send request to API
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'text',
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result: GeminiAnalysisResult = await response.json();

      // Add AI response to chat
      const assistantMessage: ChatMessage = {
        id: generateId(),
        type: 'assistant',
        content: result.analysis,
        timestamp: new Date(),
        analysis: result,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error sending text message:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response from farm assistant');
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: generateId(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send image to the AI farmbot for analysis
   */
  const sendImageMessage = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size must be less than 10MB');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Create preview URL for user message
    const imageUrl = URL.createObjectURL(file);

    // Add user message with image
    const userMessage: ChatMessage = {
      id: generateId(),
      type: 'user',
      content: `Uploaded image: ${file.name}`,
      timestamp: new Date(),
      imageUrl,
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Prepare form data for API
      const formData = new FormData();
      formData.append('type', 'image');
      formData.append('image', file);

      // Send request to API
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result: GeminiAnalysisResult = await response.json();

      // Add AI response to chat
      const assistantMessage: ChatMessage = {
        id: generateId(),
        type: 'assistant',
        content: result.analysis,
        timestamp: new Date(),
        analysis: result,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error sending image:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: generateId(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error analyzing your image. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Clean up the object URL
      URL.revokeObjectURL(imageUrl);
    }
  };

  /**
   * Handle form submission for text input
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      sendTextMessage(inputText);
    }
  };

  /**
   * Handle file selection from input
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sendImageMessage(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle drag and drop functionality
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      sendImageMessage(file);
    } else {
      setError('Please drop a valid image file');
    }
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  /**
   * Clear error message
   */
  const clearError = () => setError(null);

  /**
   * Format timestamp for messages
   */
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  /**
   * Render structured analysis response
   */
  const renderAnalysis = (analysis: GeminiAnalysisResult) => (
    <div className="space-y-4 mt-3">
      {/* Recommendations */}
      {analysis.recommendations?.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4" />
            Recommendations
          </h4>
          <ul className="space-y-1">
            {analysis.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                <div className="w-1 h-1 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Personalized Schedule */}
      {analysis.personalizedSchedule?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-semibold text-blue-800 mb-2">📅 Personalized Schedule</h4>
          {analysis.personalizedSchedule.map((schedule, index) => (
            <div key={index} className="mb-2 last:mb-0">
              <div className="text-sm font-medium text-blue-700">{schedule.timeframe}</div>
              <ul className="ml-2 mt-1 space-y-1">
                {schedule.tasks.map((task, taskIndex) => (
                  <li key={taskIndex} className="text-sm text-blue-600 flex items-start gap-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Risks */}
      {analysis.risks?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" />
            Risks to Watch
          </h4>
          <ul className="space-y-1">
            {analysis.risks.map((risk, index) => (
              <li key={index} className="text-sm text-amber-700 flex items-start gap-2">
                <div className="w-1 h-1 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Did You Know */}
      {analysis.didYouKnow && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <h4 className="font-semibold text-purple-800 mb-2">💡 Did You Know?</h4>
          <p className="text-sm text-purple-700">{analysis.didYouKnow}</p>
        </div>
      )}

      {/* Confidence Score */}
      {analysis.confidence && (
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span>Confidence:</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${analysis.confidence}%` }}
            ></div>
          </div>
          <span>{analysis.confidence}%</span>
        </div>
      )}
    </div>
  );

  return (
    <div className={`fixed z-50 ${getPositionClasses()} ${className}`}>
      {/* Error Toast */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg max-w-80">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-700">{error}</p>
              <button 
                onClick={clearError}
                className="text-xs text-red-600 hover:text-red-800 mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          aria-label="Open farm assistant chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Main Chat Window */}
      {isOpen && (
        <div 
          className={`bg-white rounded-2xl shadow-2xl border border-gray-200 w-96 h-[32rem] flex flex-col ${
            dragActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold">Farm Assistant</h3>
                  <p className="text-xs text-green-100">AI-powered crop advisor</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Camera className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                <p className="text-sm mb-2">Welcome to your AI Farm Assistant!</p>
                <p className="text-xs">Ask about crops, irrigation, livestock, or upload images for analysis.</p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  message.type === 'user' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {/* User image preview */}
                  {message.imageUrl && (
                    <img 
                      src={message.imageUrl} 
                      alt="Uploaded crop image" 
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                  )}
                  
                  {/* Message content */}
                  <p className="text-sm">{message.content}</p>
                  
                  {/* Structured analysis for assistant messages */}
                  {message.type === 'assistant' && message.analysis && renderAnalysis(message.analysis)}
                  
                  {/* Message timestamp */}
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-green-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                  <span className="text-sm text-gray-600">Analyzing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about crops, irrigation, pests..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={1}
                    disabled={isLoading}
                  />
                </div>
                
                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="p-3 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload image for analysis"
                >
                  <Upload className="w-5 h-5" />
                </button>
                
                {/* Send button */}
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Drag overlay */}
          {dragActive && (
            <div className="absolute inset-0 bg-green-500 bg-opacity-10 border-2 border-dashed border-green-500 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-700 font-medium">Drop image here to analyze</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}