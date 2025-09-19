//app/upload/page.tsx - Main upload and analysis page with Sentinel Hub integration

'use client';
import Layout from '@/components/layout/Layout';
import React, { useState } from 'react';
import Vision from './components/Vision';
import Download from './components/Download';
import Upload from './components/FileUpload';
import FarmMaps from './components/FarmMaps'; 

export default function Home() {
  // State management
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ progress: 0, status: 'idle' });
  const [language, setLanguage] = useState<'english' | 'swahili'>('english');

  // Handle file upload
  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    console.log('Starting file upload:', file.name, 'Type:', type);
    
    setUploadProgress({ progress: 0, status: 'uploading' });
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = Math.min(prev.progress + 10, 90);
        return { ...prev, progress: newProgress };
      });
    }, 200);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      clearInterval(interval);
      setUploadProgress({ progress: 100, status: 'analyzing' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
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
    setLanguage(prev => prev === 'english' ? 'swahili' : 'english');
  };

  // Download handlers
  const handleDownloadAnalysis = (result: any) => console.log('Downloading analysis as text:', result.filename);
  const handleDownloadAnalysisAsPDF = (result: any) => console.log('Downloading analysis as PDF:', result.filename);
  const handleDownloadAllAnalyses = () => console.log('Downloading all analyses as text');
  const handleDownloadAllAnalysesAsPDF = () => console.log('Downloading all analyses as PDF');

  return (
    <Layout>
      <div className="min-h-screen bg-green-50 p-4 pt-24">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column - Upload, Download, Sentinel */}
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
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Satellite Insights 🌍</h2>
              <FarmMaps /> {/*Sentinel section */}
            </div>
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
    </Layout>
  );
}
