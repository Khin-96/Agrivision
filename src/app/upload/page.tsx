'use client';

import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast'; 
import FileUpload from './components/FileUpload';
import Vision from './components/Vision';
import LiveVision from './components/live';
import { AnalysisResponse } from '@/lib/api';
import Layout from '@/components/layout/Layout';
import Image from 'next/image';

interface PageState {
  currentAnalysis: AnalysisResponse | null;
  visionContext: string;
  showVision: boolean;
  language: 'english' | 'kiswahili';
  isLiveMode?: boolean;
}

export default function UploadPage() {
  const [pageState, setPageState] = useState<PageState>({
    currentAnalysis: null,
    visionContext: '',
    showVision: false,
    language: 'english',
    isLiveMode: false
  });

  const handleAnalysisComplete = (result: AnalysisResponse) => {
    console.log('Analysis completed:', {
      success: result.success,
      filename: result.filename,
      type: result.type,
      categoriesCount: result.categories?.length || 0
    });

    setPageState(prev => ({
      ...prev,
      currentAnalysis: result,
      showVision: true
    }));
  };

  const handleVisionContextUpdate = (context: string) => {
    console.log('Updating Vision context:', {
      contextLength: context.length,
      timestamp: new Date().toISOString()
    });

    setPageState(prev => ({
      ...prev,
      visionContext: context
    }));
  };

  const toggleLanguage = () => {
    setPageState(prev => {
      const newLanguage = prev.language === 'english' ? 'kiswahili' : 'english';
      console.log('Language toggled to:', newLanguage);
      return {
        ...prev,
        language: newLanguage
      };
    });
  };

  const toggleVision = () => {
    setPageState(prev => ({
      ...prev,
      showVision: !prev.showVision
    }));
  };

  const handleContextUpdate = (context: string) => {
    console.log('Vision context updated internally:', context.length);
  };

  // Helper for Vision component (expects 'swahili' not 'kiswahili')
  const getVisionLanguage = (): 'english' | 'swahili' => {
    return pageState.language === 'kiswahili' ? 'swahili' : 'english';
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#10b981', color: '#ffffff' },
            success: { style: { background: '#10b981' } },
            error: { style: { background: '#ef4444' } },
          }}
        />

        {/* Header */}
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-green-800 mb-4">
              {pageState.language === 'kiswahili' 
                ? 'Upakiaji na Uchambuzi wa Mazao' 
                : 'Farm Content Upload & Analysis'}
            </h1>
            <p className="text-lg text-green-600 max-w-2xl mx-auto">
              {pageState.language === 'kiswahili'
                ? 'Pakia picha au video za mazao yako kupata uchambuzi wa kina na ushauri wa kitaalamu kutoka kwa Vision AI'
                : 'Upload your farm images or videos for detailed AI analysis and expert advice from Vision AI'}
            </p>
          </div>

          {/* Language + Go Live Buttons */}
          <div className="text-center mb-6 flex justify-center gap-4 flex-wrap">
            <button
              onClick={toggleLanguage}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-medium transition-colors"
            >
              {pageState.language === 'english' ? 'Switch to Kiswahili' : 'Switch to English'}
            </button>

            {/* Go Live Button */}
            <button
              onClick={() => setPageState(prev => ({ ...prev, isLiveMode: true }))}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full font-medium transition-colors"
            >
              {pageState.language === 'english' ? '🎥 Go Live' : '🎥 Nenda Moja kwa Moja'}
            </button>
          </div>

          {/* Main Content */}
          <div className="max-w-4xl mx-auto">
            <FileUpload 
              onAnalysisComplete={handleAnalysisComplete}
              onVisionContextUpdate={handleVisionContextUpdate}
            />

            {/* Analysis Results Summary */}
            {pageState.currentAnalysis?.success && (
              <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-green-800 mb-4">
                  {pageState.language === 'kiswahili' ? 'Muhtasari wa Uchambuzi' : 'Analysis Summary'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {pageState.currentAnalysis.categories && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-medium text-blue-800 mb-2">
                        {pageState.language === 'kiswahili' ? 'Aina' : 'Categories'}
                      </h4>
                      <p className="text-sm text-blue-600">
                        {pageState.currentAnalysis.categories.join(', ')}
                      </p>
                    </div>
                  )}

                  {pageState.currentAnalysis.suggestions && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        {pageState.language === 'kiswahili' ? 'Mapendekezo' : 'Recommendations'}
                      </h4>
                      <p className="text-sm text-yellow-600">
                        {pageState.currentAnalysis.suggestions.length} {
                          pageState.language === 'kiswahili' ? 'yamepatikana' : 'found'
                        }
                      </p>
                    </div>
                  )}

                  {pageState.currentAnalysis.risks && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                      <h4 className="font-medium text-red-800 mb-2">
                        {pageState.language === 'kiswahili' ? 'Hatari' : 'Risks'}
                      </h4>
                      <p className="text-sm text-red-600">
                        {pageState.currentAnalysis.risks.length} {
                          pageState.language === 'kiswahili' ? 'zimegunduliwa' : 'identified'
                        }
                      </p>
                    </div>
                  )}

                  {pageState.currentAnalysis.didYouKnow && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h4 className="font-medium text-purple-800 mb-2">
                        {pageState.language === 'kiswahili' ? 'Mambo ya Kujua' : 'Did You Know'}
                      </h4>
                      <p className="text-sm text-purple-600">
                        {pageState.currentAnalysis.didYouKnow.length} {
                          pageState.language === 'kiswahili' ? 'ukweli' : 'facts'
                        }
                      </p>
                    </div>
                  )}
                </div>

                {pageState.currentAnalysis.analysis && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-800 mb-2">
                      {pageState.language === 'kiswahili' ? 'Uchambuzi Mkuu' : 'Main Analysis'}
                    </h4>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {pageState.currentAnalysis.analysis.substring(0, 200)}...
                    </p>
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      💬 {pageState.language === 'kiswahili' 
                        ? 'Uliza Vision maswali zaidi kuhusu uchambuzi huu!'
                        : 'Ask Vision more questions about this analysis!'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Avatar Button for Vision AI */}
        <div className="fixed bottom-6 right-6 z-50">
          <button onClick={toggleVision} className="focus:outline-none">
            <Image
              src="/avatar.png" 
              alt="Avatar"
              width={64}
              height={64}
              className="rounded-full ring-2 ring-green-500 hover:ring-green-700 transition-all"
            />
          </button>
        </div>

        {/* Vision AI Widget */}
        {pageState.showVision && (
          <div className="fixed bottom-20 right-6 w-96 h-[80vh] max-h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
            <Vision 
              analysisResults={pageState.currentAnalysis ? [pageState.currentAnalysis] : []}
              language={getVisionLanguage()}
              onLanguageToggle={toggleLanguage}
              isOpen={pageState.showVision}
              onToggle={toggleVision}
              analysisContext={pageState.visionContext}
              onContextUpdate={handleContextUpdate}
            />
          </div>
        )}

        {/* LiveVision Modal */}
        {pageState.isLiveMode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-lg h-[90vh] rounded-xl overflow-hidden shadow-2xl border border-gray-200 relative">
              <LiveVision
                onClose={() => setPageState(prev => ({ ...prev, isLiveMode: false }))}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}