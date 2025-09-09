'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  allowVideo?: boolean; // ✅ added support for video uploads
}

export default function ImageUpload({ onImageUpload, allowVideo = false }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: allowVideo
      ? { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'], 'video/*': ['.mp4', '.mov', '.webm'] }
      : { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 52428800, // 50MB for videos
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileUpload(acceptedFiles[0]);
      }
    },
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection.errors[0].code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${allowVideo ? '50MB' : '10MB'}.`);
      } else {
        setError(allowVideo
          ? 'Please upload a valid image or video file.'
          : 'Please upload a valid image file (JPEG, PNG, WebP).'
        );
      }
    }
  });

  const handleFileUpload = (file: File) => {
    setIsLoading(true);
    setError(null);

    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Pass the file up
    onImageUpload(file);
    setIsLoading(false);
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
          isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-gray-600">
            {isDragActive
              ? 'Drop the file here...'
              : `Drag & drop ${allowVideo ? 'an image or video' : 'an image'} here, or click to select`}
          </p>
          <p className="text-xs text-gray-500">
            {allowVideo ? 'PNG, JPG, WEBP, MP4, MOV, WEBM up to 50MB' : 'PNG, JPG, WEBP up to 10MB'}
          </p>
        </div>
      </div>

      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

      {isLoading && (
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      )}

      {preview && !isLoading && (
        <div className="mt-4">
          {allowVideo && preview.match(/\.(mp4|mov|webm)$/i) ? (
            <video
              src={preview}
              controls
              className="w-full h-64 rounded-lg object-contain"
            />
          ) : (
            <div className="relative h-64 w-full overflow-hidden rounded-lg">
              <Image
                src={preview}
                alt="Preview"
                fill
                style={{ objectFit: 'contain' }}
                className="rounded-lg"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
