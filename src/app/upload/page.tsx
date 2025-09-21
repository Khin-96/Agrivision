// app/upload/page.tsx - Main upload and analysis page

'use client';
import Layout from '@/components/layout/Layout';
import React, { useState } from 'react';
import Vision from './components/Vision';
import Download from './components/Download';
import FileUpload from './components/FileUpload';
import Toast from './components/Toast';
import { AnalysisResponse } from '@/lib/api';

export default function UploadPage() {
  // State management
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [language, setLanguage] = useState<'english' | 'swahili'>('english');
  const [isVisionOpen, setIsVisionOpen] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Show toast message
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Handle analysis complete
  const handleAnalysisComplete = (result: AnalysisResponse) => {
    if (result.success) {
      const newResult = {
        type: result.type,
        filename: result.filename || 'Uploaded file',
        analysis: result.analysis,
        timestamp: new Date().toISOString(),
      };
      
      setAnalysisResults(prev => [newResult, ...prev]);
      showToast(
        language === 'swahili' ? 'Uchambuzi umekamilika!' : 'Analysis completed!',
        'success'
      );
    } else {
      showToast(
        language === 'swahili' 
          ? 'Uchambuzi umeshindwa. Tafadhali jaribu tena.' 
          : 'Analysis failed. Please try again.',
        'error'
      );
    }
  };

  // Toggle language
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'english' ? 'swahili' : 'english');
  };

  // Toggle vision widget
  const toggleVision = () => {
    setIsVisionOpen(prev => !prev);
  };

  // Download handlers
  const handleDownloadAnalysis = (result: any) => {
    console.log('Downloading analysis as text:', result.filename);
    showToast(
      language === 'swahili' ? 'Inapakua uchambuzi...' : 'Downloading analysis...',
      'success'
    );
  };

  const handleDownloadAnalysisAsPDF = (result: any) => {
    console.log('Downloading analysis as PDF:', result.filename);
    showToast(
      language === 'swahili' ? 'Inapakua PDF...' : 'Downloading PDF...',
      'success'
    );
  };

  const handleDownloadAllAnalyses = () => {
    console.log('Downloading all analyses as text');
    showToast(
      language === 'swahili' ? 'Inapakua uchambuzi wote...' : 'Downloading all analyses...',
      'success'
    );
  };

  const handleDownloadAllAnalysesAsPDF = () => {
    console.log('Downloading all analyses as PDF');
    showToast(
      language === 'swahili' ? 'Inapakua PDF za uchambuzi wote...' : 'Downloading all analyses as PDF...',
      'success'
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white p-4 pt-24">
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
        
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Content - Upload and Results */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                  {language === 'swahili' ? 'Uchambuzi wa Mazao' : 'Crop Analysis'}
                </h1>
                <p className="text-gray-600 mb-6">
                  {language === 'swahili' 
                    ? 'Pakia picha au video ya shamba lako kuchambuliwa na AI' 
                    : 'Upload images or videos of your farm for AI analysis'}
                </p>
                
                <FileUpload onAnalysisComplete={handleAnalysisComplete} />
              </div>
              
              {analysisResults.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    {language === 'swahili' ? 'Matokeo ya Uchambuzi' : 'Analysis Results'}
                  </h2>
                  
                  <Download 
                    analysisResults={analysisResults}
                    onDownloadAnalysis={handleDownloadAnalysis}
                    onDownloadAnalysisAsPDF={handleDownloadAnalysisAsPDF}
                    onDownloadAllAnalyses={handleDownloadAllAnalyses}
                    onDownloadAllAnalysesAsPDF={handleDownloadAllAnalysesAsPDF}
                  />
                  
                  <div className="mt-6 space-y-4">
                    {analysisResults.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-800">{result.filename}</h3>
                          <span className="text-xs text-gray-500">
                            {new Date(result.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">{result.analysis}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Sidebar - Optional content can go here */}
            <div className="lg:col-span-1">
              {/* You can add additional content here if needed */}
            </div>
          </div>
        </div>
        
        {/* Vision Widget */}
        <Vision 
          analysisResults={analysisResults}
          language={language}
          onLanguageToggle={toggleLanguage}
          isOpen={isVisionOpen}
          onToggle={toggleVision}
        />
        
        {/* Vision toggle button when closed */}
        {!isVisionOpen && (
          <button
            onClick={toggleVision}
            className="fixed bottom-4 right-4 z-40 bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition-colors"
            title="Open Vision Assistant"
          >
            <Bot size={24} />
          </button>
        )}
      </div>
    </Layout>
  );
}