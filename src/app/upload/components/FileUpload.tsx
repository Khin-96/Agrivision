// src/app/upload/components/FileUpload.tsx
'use client';

import React, { useRef, useState } from 'react';
import { Upload as UploadIcon, Camera, Video, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { analyzeFarmContent, AnalysisResponse } from '@/lib/api';

interface UploadProgress {
  progress: number;
  status: 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';
  error?: string;
  result?: AnalysisResponse;
}

interface FileUploadProps {
  onAnalysisComplete?: (result: AnalysisResponse) => void;
}

export default function FileUpload({ onAnalysisComplete }: FileUploadProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    status: 'idle'
  });

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    try {
      // Reset progress
      setUploadProgress({
        progress: 0,
        status: 'uploading'
      });

      // Simulate upload progress (you can replace this with actual progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev.progress >= 90) {
            clearInterval(progressInterval);
            return { ...prev, progress: 90, status: 'analyzing' };
          }
          return { ...prev, progress: prev.progress + 10 };
        });
      }, 200);

      // Call the API
      const result = await analyzeFarmContent(file, type);

      clearInterval(progressInterval);
      
      if (result.success) {
        setUploadProgress({
          progress: 100,
          status: 'success',
          result
        });
        
        if (onAnalysisComplete) {
          onAnalysisComplete(result);
        }
      } else {
        setUploadProgress({
          progress: 0,
          status: 'error',
          error: result.error || 'Analysis failed'
        });
      }

    } catch (error) {
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed. Please try again.'
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: 'Please select a valid image file'
      });
      return;
    }

    if (type === 'video' && !file.type.startsWith('video/')) {
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: 'Please select a valid video file'
      });
      return;
    }

    // Validate file size (50MB max as per your backend)
    if (file.size > 50 * 1024 * 1024) {
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: 'File too large. Maximum size is 50MB'
      });
      return;
    }

    handleFileUpload(file, type);
  };

  const handleDrop = (e: React.DragEvent, type: 'image' | 'video') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    handleFileSelect({
      target: { files: [file] }
    } as React.ChangeEvent<HTMLInputElement>, type);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
          <ImageIcon size={20} className="mr-2" />
          Upload Image for Analysis
        </h3>
        <div
          className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center cursor-pointer hover:bg-green-50 transition-colors"
          onClick={() => imageInputRef.current?.click()}
          onDrop={(e) => handleDrop(e, 'image')}
          onDragOver={handleDragOver}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, 'image')}
            className="hidden"
          />
          <div className="flex flex-col items-center">
            <UploadIcon size={48} className="text-green-500 mb-2" />
            <p className="text-green-700 font-medium">Click to upload or drag and drop</p>
            <p className="text-gray-500 text-sm mt-1">JPG, PNG, WEBP (Max 50MB)</p>
          </div>
        </div>
      </div>

      {/* Video Upload */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
          <Video size={20} className="mr-2" />
          Upload Video for Analysis
        </h3>
        <div
          className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center cursor-pointer hover:bg-green-50 transition-colors"
          onClick={() => videoInputRef.current?.click()}
          onDrop={(e) => handleDrop(e, 'video')}
          onDragOver={handleDragOver}
        >
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => handleFileSelect(e, 'video')}
            className="hidden"
          />
          <div className="flex flex-col items-center">
            <Camera size={48} className="text-green-500 mb-2" />
            <p className="text-green-700 font-medium">Click to upload or drag and drop</p>
            <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI (Max 50MB)</p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.status !== 'idle' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Upload Status</h3>
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
          {uploadProgress.status === 'analyzing' && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
              <p className="text-sm text-gray-600">Analyzing content with AI...</p>
            </div>
          )}
          {uploadProgress.status === 'error' && uploadProgress.error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center">
              <AlertCircle size={16} className="text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{uploadProgress.error}</p>
            </div>
          )}
          {uploadProgress.status === 'success' && uploadProgress.result && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="text-green-700 text-sm font-medium">Analysis Complete!</p>
              <p className="text-green-600 text-sm mt-1">{uploadProgress.result.analysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}