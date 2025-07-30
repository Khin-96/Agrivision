'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface UploadContextType {
  imageFile: File | null;
  metadata: Record<string, string>;
  setImageFile: (file: File | null) => void;
  setMetadata: (metadata: Record<string, string>) => void;
  resetUpload: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<Record<string, string>>({});

  const resetUpload = () => {
    setImageFile(null);
    setMetadata({});
  };

  return (
    <UploadContext.Provider
      value={{
        imageFile,
        metadata,
        setImageFile,
        setMetadata,
        resetUpload,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within a UploadProvider');
  }
  return context;
}
