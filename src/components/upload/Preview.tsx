'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PreviewProps {
  imageFile: File | null;
  metadata: Record<string, string>;
  onProceed: () => void;
}

export default function Preview({ imageFile, metadata, onProceed }: PreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Create preview URL when imageFile changes
  useState(() => {
    if (!imageFile) return;
    
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    
    // Free memory when component unmounts
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  });

  if (!imageFile || !previewUrl) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Review Your Submission</h3>
      
      <div className="overflow-hidden rounded-lg bg-gray-50 p-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Image</h4>
            <div className="mt-2 relative h-64 w-full overflow-hidden rounded-lg">
              <Image
                src={previewUrl}
                alt="Preview"
                fill
                style={{ objectFit: 'contain' }}
                className="rounded-lg"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700">Details</h4>
            <dl className="mt-2 space-y-3">
              {Object.entries(metadata).map(([key, value]) => (
                value && (
                  <div key={key}>
                    <dt className="text-xs font-medium text-gray-500 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{value}</dd>
                  </div>
                )
              ))}
            </dl>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          onClick={() => window.history.back()}
        >
          Back
        </button>
        <button
          type="button"
          className="rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          onClick={onProceed}
        >
          Analyze Image
        </button>
      </div>
    </div>
  );
}
