// src/app/upload/components/FileUpload.tsx
'use client';

import React, { useRef } from 'react';
import { Upload as UploadIcon, Camera, Video, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface UploadProgress {
  progress: number;
  status: 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';
  error?: string;
}

interface FileUploadProps {
  onFileUpload: (file: File, type: 'image' | 'video') => void;
  uploadProgress: UploadProgress;
}

// Rename the component function to FileUpload
export default function FileUpload({ onFileUpload, uploadProgress }: FileUploadProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'image' && !file.type.startsWith('image/')) return;
    if (type === 'video' && !file.type.startsWith('video/')) return;
    if (file.size > 100 * 1024 * 1024) return;

    onFileUpload(file, type);
  };

  const handleDrop = (e: React.DragEvent, type: 'image' | 'video') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (type === 'image' && !file.type.startsWith('image/')) return;
    if (type === 'video' && !file.type.startsWith('video/')) return;

    onFileUpload(file, type);
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
            onChange={(e) => handleFileUpload(e, 'image')}
            className="hidden"
          />
          <div className="flex flex-col items-center">
            <UploadIcon size={48} className="text-green-500 mb-2" />
            <p className="text-green-700 font-medium">Click to upload or drag and drop</p>
            <p className="text-gray-500 text-sm mt-1">JPG, PNG, WEBP (Max 100MB)</p>
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
            onChange={(e) => handleFileUpload(e, 'video')}
            className="hidden"
          />
          <div className="flex flex-col items-center">
            <Camera size={48} className="text-green-500 mb-2" />
            <p className="text-green-700 font-medium">Click to upload or drag and drop</p>
            <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI (Max 100MB)</p>
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
              <p className="text-sm text-gray-600">Analyzing content...</p>
            </div>
          )}
          {uploadProgress.status === 'error' && uploadProgress.error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center">
              <AlertCircle size={16} className="text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{uploadProgress.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
