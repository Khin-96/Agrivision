// src/app/upload/page.tsx
'use client';

import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast'; 
import FileUpload from './components/FileUpload';
import Vision from './components/Vision';
import { AnalysisResponse } from '@/lib/api';
import Layout from '@/components/layout/Layout';

interface PageState {
  currentAnalysis: AnalysisResponse | null;
  visionContext: string;
  showVision: boolean;
  language: 'english' | 'swahili';
}

export default function UploadPage() {
  const [pageState, setPageState] = useState<PageState>({
    currentAnalysis: null,
    visionContext: '',
    showVision: false,
    language: 'english'
  });

  /**
   * Handles when Gemini analysis is complete
   * Updates the current analysis and prepares Vision context
   */
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
      showVision: true // Show Vision widget after analysis
    }));
  };

  /**
   * Handles Vision context updates from FileUpload
   * This is called when new analysis results are ready
   */
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

  /**
   * Toggles language between English and Swahili
   */
  const toggleLanguage = () => {
    setPageState(prev => {
      const newLanguage = prev.language === 'english' ? 'swahili' : 'english';
      console.log('Language toggled to:', newLanguage);
      return {
        ...prev,
        language: newLanguage
      };
    });
  };

  /**
   * Toggles Vision AI visibility
   */
  const toggleVision = () => {
    setPageState(prev => ({
      ...prev,
      showVision: !prev.showVision
    }));
  };

  /**
   * Additional context update handler for Vision component
   */
  const handleContextUpdate = (context: string) => {
    console.log('Vision context updated internally:', context.length);
    // This can be used for additional logging or state management
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Toast notifications container */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#10b981',
              color: '#ffffff',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
        
        {/* Header */}
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-green-800 mb-4">
              {pageState.language === 'swahili' 
                ? 'Upakiaji na Uchambuzi wa Mazao' 
                : 'Farm Content Upload & Analysis'}
            </h1>
            <p className="text-lg text-green-600 max-w-2xl mx-auto">
              {pageState.language === 'swahili'
                ? 'Pakia picha au video za mazao yako kupata uchambuzi wa kina na ushauri wa kitaalamu kutoka kwa Vision AI'
                : 'Upload your farm images or videos for detailed AI analysis and expert advice from Vision AI'}
            </p>
          </div>

          {/* Language Toggle Button */}
          <div className="text-center mb-6">
            <button
              onClick={toggleLanguage}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-medium transition-colors"
            >
              {pageState.language === 'english' ? 'Switch to Kiswahili' : 'Switch to English'}
            </button>
          </div>

          {/* Main Content */}
          <div className="max-w-4xl mx-auto">
            <FileUpload 
              onAnalysisComplete={handleAnalysisComplete}
              onVisionContextUpdate={handleVisionContextUpdate}
            />

            {/* Analysis Results Summary */}
            {pageState.currentAnalysis && pageState.currentAnalysis.success && (
              <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-green-800 mb-4">
                  {pageState.language === 'swahili' ? 'Muhtasari wa Uchambuzi' : 'Analysis Summary'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {pageState.currentAnalysis.categories && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-medium text-blue-800 mb-2">
                        {pageState.language === 'swahili' ? 'Aina' : 'Categories'}
                      </h4>
                      <p className="text-sm text-blue-600">
                        {pageState.currentAnalysis.categories.join(', ')}
                      </p>
                    </div>
                  )}
                  
                  {pageState.currentAnalysis.suggestions && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        {pageState.language === 'swahili' ? 'Mapendekezo' : 'Recommendations'}
                      </h4>
                      <p className="text-sm text-yellow-600">
                        {pageState.currentAnalysis.suggestions.length} {
                          pageState.language === 'swahili' ? 'yamepatikana' : 'found'
                        }
                      </p>
                    </div>
                  )}
                  
                  {pageState.currentAnalysis.risks && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                      <h4 className="font-medium text-red-800 mb-2">
                        {pageState.language === 'swahili' ? 'Hatari' : 'Risks'}
                      </h4>
                      <p className="text-sm text-red-600">
                        {pageState.currentAnalysis.risks.length} {
                          pageState.language === 'swahili' ? 'zimegunduliwa' : 'identified'
                        }
                      </p>
                    </div>
                  )}
                  
                  {pageState.currentAnalysis.didYouKnow && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h4 className="font-medium text-purple-800 mb-2">
                        {pageState.language === 'swahili' ? 'Mambo ya Kujua' : 'Did You Know'}
                      </h4>
                      <p className="text-sm text-purple-600">
                        {pageState.currentAnalysis.didYouKnow.length} {
                          pageState.language === 'swahili' ? 'ukweli' : 'facts'
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* Analysis Text Preview */}
                {pageState.currentAnalysis.analysis && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-800 mb-2">
                      {pageState.language === 'swahili' ? 'Uchambuzi Mkuu' : 'Main Analysis'}
                    </h4>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {pageState.currentAnalysis.analysis.substring(0, 200)}...
                    </p>
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      💬 {pageState.language === 'swahili' 
                        ? 'Uliza Vision maswali zaidi kuhusu uchambuzi huu!'
                        : 'Ask Vision more questions about this analysis!'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Vision AI Toggle Button */}
            <div className="mt-8 text-center">
              <button
                onClick={toggleVision}
                className={`px-6 py-3 rounded-lg font-medium transition-colors shadow-lg ${
                  pageState.showVision 
                    ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {pageState.showVision 
                  ? (pageState.language === 'swahili' ? 'Ficha Vision AI' : 'Hide Vision AI')
                  : (pageState.language === 'swahili' ? 'Onyesha Vision AI' : 'Show Vision AI')
                }
              </button>
            </div>

            {/* Features Section - Professional Squares Layout */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-center text-green-800 mb-8">
                {pageState.language === 'swahili' ? 'Vipengele vya Vision AI' : 'Vision AI Features'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Deep Analysis Feature */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="bg-green-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    {pageState.language === 'swahili' ? 'Uchambuzi wa Kina' : 'Deep Analysis'}
                  </h3>
                  <p className="text-gray-600">
                    {pageState.language === 'swahili'
                      ? 'Ainisha magonjwa, wadudu na hali ya mazao kwa usahihi wa hali ya juu'
                      : 'Identify diseases, pests, and crop conditions with high accuracy'}
                  </p>
                </div>

                {/* Personal Schedules Feature */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📅</span>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    {pageState.language === 'swahili' ? 'Ratiba za Kibinafsi' : 'Personal Schedules'}
                  </h3>
                  <p className="text-gray-600">
                    {pageState.language === 'swahili'
                      ? 'Pata ratiba maalum za kupanda, kumwagilia na kuvuna kulingana na hali ya mazao yako'
                      : 'Get customized planting, irrigation and harvest schedules based on your crop conditions'}
                  </p>
                </div>

                {/* Real-time Advice Feature */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="bg-yellow-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">💡</span>
                  </div>
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    {pageState.language === 'swahili' ? 'Ushauri wa Papo Hapo' : 'Real-time Advice'}
                  </h3>
                  <p className="text-gray-600">
                    {pageState.language === 'swahili'
                      ? 'Pata majibu ya haraka kwa maswali yako yote ya kilimo kutoka kwa AI mtaalamu'
                      : 'Get instant answers to all your farming questions from expert AI'}
                  </p>
                </div>

                {/* Disease Prevention Feature */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="bg-red-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">🛡️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    {pageState.language === 'swahili' ? 'Kinga ya Magonjwa' : 'Disease Prevention'}
                  </h3>
                  <p className="text-gray-600">
                    {pageState.language === 'swahili'
                      ? 'Tambua dalili za magonjwa mapema na upate ushauri wa kuzuia'
                      : 'Identify disease symptoms early and get preventive advice'}
                  </p>
                </div>

                {/* Growth Monitoring Feature */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="bg-purple-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📈</span>
                  </div>
                  <h3 className="text-lg font-semibold text-purple-800 mb-2">
                    {pageState.language === 'swahili' ? 'Ufuatiliaji wa Ukuaji' : 'Growth Monitoring'}
                  </h3>
                  <p className="text-gray-600">
                    {pageState.language === 'swahili'
                      ? 'Fuatilia maendeleo ya mazao yako kwa muda na upate mapendekezo ya kuboresha'
                      : 'Track your crop progress over time and get improvement recommendations'}
                  </p>
                </div>

                {/* Weather Adaptation Feature */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="bg-cyan-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">🌦️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-cyan-800 mb-2">
                    {pageState.language === 'swahili' ? 'Ubadilishaji wa Hali ya Hewa' : 'Weather Adaptation'}
                  </h3>
                  <p className="text-gray-600">
                    {pageState.language === 'swahili'
                      ? 'Pata ushauri maalum unaozingatia hali ya hewa ya eneo lako na mabadiliko ya tabianchi'
                      : 'Get tailored advice considering your local weather and climate changes'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vision AI Widget */}
        {pageState.showVision && (
          <div className="fixed bottom-6 right-6 w-96 h-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
            <Vision 
              analysisResults={pageState.currentAnalysis ? [pageState.currentAnalysis] : []}
              language={pageState.language}
              onLanguageToggle={toggleLanguage}
              isOpen={pageState.showVision}
              onToggle={toggleVision}
              analysisContext={pageState.visionContext}
              onContextUpdate={handleContextUpdate}
              widgetMode={true}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}