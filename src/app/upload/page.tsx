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
    showVision: true,
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
      showVision: true // Ensure Vision is visible after analysis
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
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
            <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-4">
                {pageState.language === 'swahili' ? 'Muhtasari wa Uchambuzi' : 'Analysis Summary'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {pageState.currentAnalysis.categories && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">
                      {pageState.language === 'swahili' ? 'Aina' : 'Categories'}
                    </h4>
                    <p className="text-sm text-blue-600">
                      {pageState.currentAnalysis.categories.join(', ')}
                    </p>
                  </div>
                )}
                
                {pageState.currentAnalysis.suggestions && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
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
                  <div className="bg-red-50 p-4 rounded-lg">
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
                  <div className="bg-purple-50 p-4 rounded-lg">
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
                <div className="bg-gray-50 p-4 rounded-lg">
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

          {/* Vision AI Toggle Button (when hidden) */}
          {!pageState.showVision && (
            <div className="mt-6 text-center">
              <button
                onClick={toggleVision}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg"
              >
                {pageState.language === 'swahili' ? 'Onyesha Vision AI' : 'Show Vision AI'}
              </button>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">
              {pageState.language === 'swahili' ? 'Jinsi ya Kutumia' : 'How to Use'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-green-700 mb-2">
                  {pageState.language === 'swahili' ? '1. Pakia Picha au Video' : '1. Upload Image or Video'}
                </h4>
                <p className="text-sm text-gray-600">
                  {pageState.language === 'swahili' 
                    ? 'Chagua picha au video ya mazao, mifugo, au shughuli za kilimo'
                    : 'Select an image or video of your crops, livestock, or farming activities'}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-green-700 mb-2">
                  {pageState.language === 'swahili' ? '2. Subiri Uchambuzi' : '2. Wait for Analysis'}
                </h4>
                <p className="text-sm text-gray-600">
                  {pageState.language === 'swahili'
                    ? 'AI itachambua yaliyomo na kutoa mapendekezo ya kitaalamu'
                    : 'AI will analyze the content and provide expert recommendations'}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-green-700 mb-2">
                  {pageState.language === 'swahili' ? '3. Zungumza na Vision' : '3. Chat with Vision'}
                </h4>
                <p className="text-sm text-gray-600">
                  {pageState.language === 'swahili'
                    ? 'Uliza maswali yoyote kuhusu matokeo ya uchambuzi'
                    : 'Ask any questions about your analysis results'}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-green-700 mb-2">
                  {pageState.language === 'swahili' ? '4. Tekeleza Ushauri' : '4. Implement Advice'}
                </h4>
                <p className="text-sm text-gray-600">
                  {pageState.language === 'swahili'
                    ? 'Fuata mapendekezo ya Vision kuboresha mazao yako'
                    : 'Follow Vision\'s recommendations to improve your farming'}
                </p>
              </div>
            </div>
          </div>

          {/* Features Highlight */}
          <div className="mt-8 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">
              {pageState.language === 'swahili' ? 'Vipengele vya Vision AI' : 'Vision AI Features'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full p-3 w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                  🧠
                </div>
                <h4 className="font-medium mb-1">
                  {pageState.language === 'swahili' ? 'Uchambuzi wa Kina' : 'Deep Analysis'}
                </h4>
                <p className="text-sm opacity-90">
                  {pageState.language === 'swahili'
                    ? 'Ainisha magonjwa, wadudu na hali ya mazao'
                    : 'Identifies diseases, pests, and crop conditions'}
                </p>
              </div>
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full p-3 w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                  📅
                </div>
                <h4 className="font-medium mb-1">
                  {pageState.language === 'swahili' ? 'Ratiba za Kibinafsi' : 'Personal Schedules'}
                </h4>
                <p className="text-sm opacity-90">
                  {pageState.language === 'swahili'
                    ? 'Ratiba za kupanda, kumwagilia na kuvuna'
                    : 'Planting, irrigation, and harvest schedules'}
                </p>
              </div>
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full p-3 w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                  💡
                </div>
                <h4 className="font-medium mb-1">
                  {pageState.language === 'swahili' ? 'Ushauri wa Papo Hapo' : 'Real-time Advice'}
                </h4>
                <p className="text-sm opacity-90">
                  {pageState.language === 'swahili'
                    ? 'Jibu za haraka kwa maswali yako yote ya kilimo'
                    : 'Instant answers to all your farming questions'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vision AI Component */}
      <Vision 
        analysisResults={pageState.currentAnalysis ? [pageState.currentAnalysis] : []}
        language={pageState.language}
        onLanguageToggle={toggleLanguage}
        isOpen={pageState.showVision}
        onToggle={toggleVision}
        analysisContext={pageState.visionContext}
        onContextUpdate={handleContextUpdate}
      />

      {/* Debug Information (Remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-4 rounded-lg max-w-sm text-xs">
          <h4 className="font-bold mb-2">Debug Info:</h4>
          <p>Context Length: {pageState.visionContext.length}</p>
          <p>Analysis: {pageState.currentAnalysis ? 'Yes' : 'No'}</p>
          <p>Vision Open: {pageState.showVision ? 'Yes' : 'No'}</p>
          <p>Language: {pageState.language}</p>
        </div>
      )}
    </div>
  );
}