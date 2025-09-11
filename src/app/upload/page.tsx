'use client';

import React, { useState } from 'react';
import Vision from './components/Vision';
import Download from './components/Download';
import Upload from './components/FileUpload';


export default function Home() {
  // State management
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ progress: 0, status: 'idle' });
  const [language, setLanguage] = useState<'english' | 'swahili'>('english');

  // Handle file upload
  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    console.log('Starting file upload:', file.name, 'Type:', type);
    
    // Upload logic here
    setUploadProgress({ progress: 0, status: 'uploading' });
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = Math.min(prev.progress + 10, 90);
        return { ...prev, progress: newProgress };
      });
    }, 200);

    try {
      // Your upload logic here
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(interval);
      setUploadProgress({ progress: 100, status: 'analyzing' });
      
      // Simulate analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Add mock analysis result
      const newResult = {
        type,
        filename: file.name,
        analysis: language === 'swahili' 
          ? 'Uchambuzi wa mazao: Mazao yanaonekana yana afya nzuri. Hakuna dalili za magonjwa yanayoonekana.'
          : 'Crop analysis: Crops appear to be healthy. No visible signs of disease detected.',
        timestamp: new Date().toISOString(),
        preview: URL.createObjectURL(file)
      };
      
      setAnalysisResults(prev => [newResult, ...prev]);
      setUploadProgress({ progress: 0, status: 'success' });
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress({ 
        progress: 0, 
        status: 'error', 
        error: language === 'swahili' 
          ? 'Imeshindwa kupakia faili. Tafadhali jaribu tena.' 
          : 'Failed to upload file. Please try again.' 
      });
    }
  };

  // Toggle language
  const toggleLanguage = () => {
    console.log('Toggling language from', language, 'to', language === 'english' ? 'swahili' : 'english');
    setLanguage(prev => prev === 'english' ? 'swahili' : 'english');
  };

  // Download handlers
  const handleDownloadAnalysis = (result: any) => {
    console.log('Downloading analysis as text:', result.filename);
    // Your download logic here
  };

  const handleDownloadAnalysisAsPDF = (result: any) => {
    console.log('Downloading analysis as PDF:', result.filename);
    // Your PDF download logic here
  };

  const handleDownloadAllAnalyses = () => {
    console.log('Downloading all analyses as text');
    // Your download all logic here
  };

  const handleDownloadAllAnalysesAsPDF = () => {
    console.log('Downloading all analyses as PDF');
    // Your PDF download all logic here
  };

  return (
    <div className="min-h-screen bg-green-50 p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Upload and Download */}
        <div className="space-y-6">
          <Upload 
            onFileUpload={handleFileUpload} 
            uploadProgress={uploadProgress} 
          />
          <Download 
            analysisResults={analysisResults}
            onDownloadAnalysis={handleDownloadAnalysis}
            onDownloadAnalysisAsPDF={handleDownloadAnalysisAsPDF}
            onDownloadAllAnalyses={handleDownloadAllAnalyses}
            onDownloadAllAnalysesAsPDF={handleDownloadAllAnalysesAsPDF}
          />
        </div>
        
        {/* Right Column - Vision Chatbot */}
        <div>
          <Vision 
            analysisResults={analysisResults}
            language={language}
            onLanguageToggle={toggleLanguage}
          />
        </div>
      </div>
    </div>
  );
}