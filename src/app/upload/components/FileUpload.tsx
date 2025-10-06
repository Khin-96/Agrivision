// src/app/upload/components/FileUpload.tsx
'use client';

import React, { useRef, useState } from 'react';
import { Upload as UploadIcon, Camera, Video, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { analyzeFarmContent, AnalysisResponse } from '@/lib/api';
import { toast } from 'react-hot-toast'; // Install: npm install react-hot-toast

interface UploadProgress {
  progress: number;
  status: 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';
  error?: string;
  result?: AnalysisResponse;
}

interface FileUploadProps {
  onAnalysisComplete?: (result: AnalysisResponse) => void;
  onVisionContextUpdate?: (context: string) => void; // New prop for Vision context
}

export default function FileUpload({ onAnalysisComplete, onVisionContextUpdate }: FileUploadProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    status: 'idle'
  });

  /**
   * Creates a comprehensive context string from analysis results for Vision AI
   */
  const createVisionContext = (result: AnalysisResponse): string => {
    try {
      const contextParts = [];
      
      // Add basic analysis
      if (result.analysis) {
        contextParts.push(`ANALYSIS RESULTS:\n${result.analysis}`);
      }
      
      // Add categorized information
      if (result.categories && result.categories.length > 0) {
        contextParts.push(`CATEGORIES: ${result.categories.join(', ')}`);
      }
      
      if (result.suggestions && result.suggestions.length > 0) {
        contextParts.push(`KEY RECOMMENDATIONS:\n${result.suggestions.map(s => `- ${s}`).join('\n')}`);
      }
      
      if (result.risks && result.risks.length > 0) {
        contextParts.push(`IDENTIFIED RISKS:\n${result.risks.map(r => `- ${r}`).join('\n')}`);
      }
      
      if (result.didYouKnow && result.didYouKnow.length > 0) {
        contextParts.push(`INTERESTING FACTS:\n${result.didYouKnow.map(f => `- ${f}`).join('\n')}`);
      }
      
      // Add metadata
      if (result.filename && result.type) {
        contextParts.push(`FILE INFO: ${result.filename} (${result.type})`);
      }
      
      const context = contextParts.join('\n\n');
      
      // Log context creation for debugging
      console.log('Vision context created:', {
        contextLength: context.length,
        sections: contextParts.length,
        filename: result.filename
      });
      
      return context;
    } catch (error) {
      console.error('Error creating vision context:', error);
      toast.error('Failed to prepare analysis context');
      return result.analysis || 'Analysis completed but context preparation failed.';
    }
  };

  /**
   * Handles file upload and analysis process
   */
  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    try {
      console.log(`Starting ${type} upload:`, {
        filename: file.name,
        size: file.size,
        type: file.type
      });

      // Reset progress state first
      setUploadProgress({
        progress: 0,
        status: 'uploading'
      });

      // Show upload toast after state update
      setTimeout(() => {
        toast.loading(`Uploading ${type}...`, { id: 'upload-progress' });
      }, 0);

      // Simulate upload progress with realistic intervals
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev.progress >= 90) {
            clearInterval(progressInterval);
            // Update toast after state change
            setTimeout(() => {
              toast.loading('Analyzing with AI...', { id: 'upload-progress' });
            }, 0);
            return { ...prev, progress: 90, status: 'analyzing' };
          }
          return { ...prev, progress: prev.progress + 15 };
        });
      }, 300);

      // Call the analysis API
      const result = await analyzeFarmContent(file, type);

      clearInterval(progressInterval);
      
      if (result.success) {
        console.log('Analysis successful:', {
          filename: result.filename,
          categoriesCount: result.categories?.length || 0,
          suggestionsCount: result.suggestions?.length || 0,
          risksCount: result.risks?.length || 0
        });

        setUploadProgress({
          progress: 100,
          status: 'success',
          result
        });

        // Create context for Vision AI
        const visionContext = createVisionContext(result);
        
        // Update Vision with the analysis context
        if (onVisionContextUpdate) {
          onVisionContextUpdate(visionContext);
          console.log('Vision context updated successfully');
        }
        
        // Trigger completion callback
        if (onAnalysisComplete) {
          onAnalysisComplete(result);
        }

        // Show success toast with key insights
        const insightsCount = (result.suggestions?.length || 0) + (result.risks?.length || 0);
        setTimeout(() => {
          toast.success(
            `Analysis complete! Found ${insightsCount} key insights. Ask Vision for details!`,
            { 
              id: 'upload-progress',
              duration: 5000
            }
          );
        }, 0);

      } else {
        console.error('Analysis failed:', result.error);
        
        setUploadProgress({
          progress: 0,
          status: 'error',
          error: result.error || 'Analysis failed'
        });

        setTimeout(() => {
          toast.error(result.error || 'Analysis failed. Please try again.', {
            id: 'upload-progress',
            duration: 4000
          });
        }, 0);
      }

    } catch (error) {
      console.error('Upload/analysis error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: errorMessage
      });

      setTimeout(() => {
        toast.error(errorMessage, {
          id: 'upload-progress',
          duration: 4000
        });
      }, 0);
    }
  };

  /**
   * Shared file processing logic for both file input and drag/drop
   */
  const processFile = (file: File, type: 'image' | 'video') => {
    console.log(`Processing file:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      expectedType: type
    });

    // Validate file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      const error = 'Please select a valid image file (JPG, PNG, WEBP)';
      console.warn('Invalid image type:', file.type);
      
      setUploadProgress({
        progress: 0,
        status: 'error',
        error
      });
      
      setTimeout(() => {
        toast.error(error);
      }, 0);
      return;
    }

    if (type === 'video' && !file.type.startsWith('video/')) {
      const error = 'Please select a valid video file (MP4, MOV, AVI)';
      console.warn('Invalid video type:', file.type);
      
      setUploadProgress({
        progress: 0,
        status: 'error',
        error
      });
      
      setTimeout(() => {
        toast.error(error);
      }, 0);
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const error = 'File too large. Maximum size is 50MB';
      console.warn('File too large:', {
        size: file.size,
        maxSize,
        filename: file.name
      });
      
      setUploadProgress({
        progress: 0,
        status: 'error',
        error
      });
      
      setTimeout(() => {
        toast.error(error);
      }, 0);
      return;
    }

    // Clear any existing errors and proceed
    setUploadProgress({ progress: 0, status: 'idle' });
    handleFileUpload(file, type);
  };

  /**
   * Handles file selection with comprehensive validation
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    processFile(file, type);
    
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };

  /**
   * Handles drag and drop functionality
   */
  const handleDrop = (e: React.DragEvent, type: 'image' | 'video') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    console.log('File dropped:', { name: file.name, type: file.type });

    processFile(file, type);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  /**
   * Resets upload state
   */
  const resetUpload = () => {
    setUploadProgress({ progress: 0, status: 'idle' });
    console.log('Upload state reset');
  };

  return (
    <div className="space-y-6">
      {/* Image Upload Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
          <ImageIcon size={20} className="mr-2" />
          Upload Image for Analysis
        </h3>
        <div
          className={`border-2 border-dashed border-green-300 rounded-lg p-8 text-center cursor-pointer transition-colors ${
            uploadProgress.status === 'uploading' || uploadProgress.status === 'analyzing'
              ? 'bg-green-50 cursor-not-allowed opacity-70'
              : 'hover:bg-green-50'
          }`}
          onClick={() => {
            if (uploadProgress.status === 'uploading' || uploadProgress.status === 'analyzing') return;
            imageInputRef.current?.click();
          }}
          onDrop={(e) => {
            if (uploadProgress.status === 'uploading' || uploadProgress.status === 'analyzing') return;
            handleDrop(e, 'image');
          }}
          onDragOver={handleDragOver}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, 'image')}
            className="hidden"
            disabled={uploadProgress.status === 'uploading' || uploadProgress.status === 'analyzing'}
          />
          <div className="flex flex-col items-center">
            <UploadIcon size={48} className="text-green-500 mb-2" />
            <p className="text-green-700 font-medium">Click to upload or drag and drop</p>
            <p className="text-gray-500 text-sm mt-1">JPG, PNG, WEBP (Max 50MB)</p>
          </div>
        </div>
      </div>

      {/* Video Upload Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
          <Video size={20} className="mr-2" />
          Upload Video for Analysis
        </h3>
        <div
          className={`border-2 border-dashed border-green-300 rounded-lg p-8 text-center cursor-pointer transition-colors ${
            uploadProgress.status === 'uploading' || uploadProgress.status === 'analyzing'
              ? 'bg-green-50 cursor-not-allowed opacity-70'
              : 'hover:bg-green-50'
          }`}
          onClick={() => {
            if (uploadProgress.status === 'uploading' || uploadProgress.status === 'analyzing') return;
            videoInputRef.current?.click();
          }}
          onDrop={(e) => {
            if (uploadProgress.status === 'uploading' || uploadProgress.status === 'analyzing') return;
            handleDrop(e, 'video');
          }}
          onDragOver={handleDragOver}
        >
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => handleFileSelect(e, 'video')}
            className="hidden"
            disabled={uploadProgress.status === 'uploading' || uploadProgress.status === 'analyzing'}
          />
          <div className="flex flex-col items-center">
            <Camera size={48} className="text-green-500 mb-2" />
            <p className="text-green-700 font-medium">Click to upload or drag and drop</p>
            <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI (Max 50MB)</p>
          </div>
        </div>
      </div>

      {/* Upload Progress and Results Section */}
      {uploadProgress.status !== 'idle' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-800">Upload Status</h3>
            {uploadProgress.status === 'error' && (
              <button
                onClick={resetUpload}
                className="text-sm text-green-600 hover:text-green-800 font-medium"
              >
                Try Again
              </button>
            )}
          </div>
          
          {/* Uploading State */}
          {uploadProgress.status === 'uploading' && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">Uploading... {Math.round(uploadProgress.progress)}%</p>
            </div>
          )}
          
          {/* Analyzing State */}
          {uploadProgress.status === 'analyzing' && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
              <p className="text-sm text-gray-600">Analyzing content with AI...</p>
            </div>
          )}
          
          {/* Error State */}
          {uploadProgress.status === 'error' && uploadProgress.error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start">
              <AlertCircle size={20} className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-700 text-sm font-medium">Analysis Failed</p>
                <p className="text-red-600 text-sm mt-1">{uploadProgress.error}</p>
              </div>
            </div>
          )}
          
          {/* Success State */}
          {uploadProgress.status === 'success' && uploadProgress.result && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-start">
                <CheckCircle size={20} className="text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-green-700 text-sm font-medium">Analysis Complete!</p>
                  <p className="text-green-600 text-sm mt-1">
                    Your {uploadProgress.result.type} has been analyzed. Ask Vision about the results!
                  </p>
                </div>
              </div>
              
              {/* Quick Results Preview */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Quick Insights:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {uploadProgress.result.categories && (
                    <div>
                      <span className="font-medium text-gray-600">Categories:</span>
                      <p className="text-gray-500 mt-1">{uploadProgress.result.categories.join(', ')}</p>
                    </div>
                  )}
                  {uploadProgress.result.suggestions && (
                    <div>
                      <span className="font-medium text-gray-600">Recommendations:</span>
                      <p className="text-gray-500 mt-1">{uploadProgress.result.suggestions.length} found</p>
                    </div>
                  )}
                  {uploadProgress.result.risks && (
                    <div>
                      <span className="font-medium text-gray-600">Risks Identified:</span>
                      <p className="text-gray-500 mt-1">{uploadProgress.result.risks.length} found</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-3 italic">
                  💡 Ask Vision AI questions like "What are the main risks?" or "How should I proceed?"
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}