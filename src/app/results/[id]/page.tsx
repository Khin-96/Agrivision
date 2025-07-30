'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import useMLAnalysis from '@/hooks/useMLAnalysis';

export default function ResultsPage() {
  const params = useParams();
  const analysisId = params.id as string;
  
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<'loading' | 'identifying' | 'analyzing' | 'complete'>('loading');
  
  const { 
    loadPlantIdentificationModel,
    loadDiseaseDetectionModel,
    analyzeImage,
    isLoading: isMLLoading,
    error: mlError
  } = useMLAnalysis();

  // Load data and models on component mount
  useEffect(() => {
    const loadData = async () => {
      // Load image and metadata from localStorage
      const storedImage = localStorage.getItem(`${analysisId}-image`);
      const storedMetadata = localStorage.getItem(`${analysisId}-metadata`);
      
      if (storedImage && storedMetadata) {
        setImageUrl(storedImage);
        setMetadata(JSON.parse(storedMetadata));
      }
      
      // Load ML models
      try {
        setAnalysisStage('loading');
        await Promise.all([
          loadPlantIdentificationModel(),
          loadDiseaseDetectionModel()
        ]);
      } catch (err) {
        setAnalysisError(err instanceof Error ? err.message : 'Failed to load ML models');
      }
    };
    
    loadData();
  }, [analysisId, loadPlantIdentificationModel, loadDiseaseDetectionModel]);

  // Run analysis when image and models are loaded
  useEffect(() => {
    const runAnalysis = async () => {
      if (!imageUrl || isMLLoading || mlError) return;
      
      try {
        setIsAnalyzing(true);
        
        // Create an image element for analysis
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = async () => {
          try {
            // Check if auto-detect is enabled
            const isAutoDetect = metadata.isAutoDetectPlant === 'true';
            const knownPlantType = isAutoDetect ? null : metadata.plantType;
            
            // Update stage based on whether we're identifying the plant
            setAnalysisStage(isAutoDetect ? 'identifying' : 'analyzing');
            
            // Wait a moment to show the identifying stage
            if (isAutoDetect) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            // Run analysis
            setAnalysisStage('analyzing');
            const results = await analyzeImage(img, knownPlantType);
            
            // Store results
            setAnalysisResults(results);
            
            // Save to history
            const historyItem = {
              id: analysisId,
              date: new Date().toISOString(),
              imageUrl,
              metadata,
              results
            };
            
            // Get existing history or initialize empty array
            const history = JSON.parse(localStorage.getItem('analysis-history') || '[]');
            history.unshift(historyItem);
            
            // Limit history to 20 items
            if (history.length > 20) {
              history.pop();
            }
            
            // Save updated history
            localStorage.setItem('analysis-history', JSON.stringify(history));
            
            setAnalysisStage('complete');
          } catch (err) {
            setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
          } finally {
            setIsAnalyzing(false);
          }
        };
        
        img.onerror = () => {
          setAnalysisError('Failed to load image for analysis');
          setIsAnalyzing(false);
        };
        
        img.src = imageUrl;
      } catch (err) {
        setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
        setIsAnalyzing(false);
      }
    };
    
    runAnalysis();
  }, [imageUrl, metadata, isMLLoading, mlError, analyzeImage]);

  // Helper function to render confidence as percentage
  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Helper function to get recommendation color
  const getRecommendationColor = (index: number): string => {
    const colors = ['bg-green-100', 'bg-blue-100', 'bg-yellow-100', 'bg-purple-100'];
    return colors[index % colors.length];
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900">Analysis Results</h1>
          
          {/* Analysis stages */}
          {isAnalyzing && (
            <div className="mt-4">
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <svg className="animate-spin h-10 w-10 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        {analysisStage === 'loading' && 'Loading analysis models...'}
                        {analysisStage === 'identifying' && 'Identifying plant species...'}
                        {analysisStage === 'analyzing' && 'Analyzing plant health...'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {analysisStage === 'loading' && 'This may take a moment to initialize.'}
                        {analysisStage === 'identifying' && 'Using AI to determine the plant type.'}
                        {analysisStage === 'analyzing' && 'Checking for signs of disease or health issues.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis error */}
          {analysisError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Analysis failed</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{analysisError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis results */}
          {!isAnalyzing && !analysisError && analysisResults && (
            <div className="mt-8 space-y-8">
              {/* Image and basic info */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Plant Analysis</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      Results from analyzing your plant image
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    analysisResults.diseaseDetection.isHealthy 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {analysisResults.diseaseDetection.isHealthy ? 'Healthy' : 'Issue Detected'}
                  </span>
                </div>
                <div className="border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-5 sm:p-6">
                    <div>
                      {imageUrl && (
                        <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden bg-gray-100">
                          <img 
                            src={imageUrl} 
                            alt="Analyzed plant" 
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Plant Type</h4>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {analysisResults.plantIdentification.className}
                          {metadata.isAutoDetectPlant === 'true' && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Auto-detected
                            </span>
                          )}
                        </p>
                        {metadata.isAutoDetectPlant === 'true' && (
                          <p className="mt-1 text-sm text-gray-500">
                            Confidence: {formatConfidence(analysisResults.plantIdentification.probability)}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Health Status</h4>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {analysisResults.diseaseDetection.isHealthy 
                            ? 'Healthy' 
                            : analysisResults.diseaseDetection.diseaseName}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Confidence: {formatConfidence(analysisResults.diseaseDetection.probability)}
                        </p>
                      </div>
                      
                      {metadata.location && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Growing Location</h4>
                          <p className="mt-1 text-sm text-gray-900">{metadata.location}</p>
                        </div>
                      )}
                      
                      {metadata.plantAge && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Plant Age</h4>
                          <p className="mt-1 text-sm text-gray-900">{metadata.plantAge}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recommendations */}
              {analysisResults.diseaseDetection.recommendations && 
               analysisResults.diseaseDetection.recommendations.length > 0 && (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Recommendations</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      Suggested actions based on the analysis
                    </p>
                  </div>
                  <div className="border-t border-gray-200">
                    <ul className="divide-y divide-gray-200">
                      {analysisResults.diseaseDetection.recommendations.map((recommendation: string, index: number) => (
                        <li key={index} className="px-4 py-4 sm:px-6">
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 h-8 w-8 rounded-full ${getRecommendationColor(index)} flex items-center justify-center`}>
                              <span className="text-sm font-medium">{index + 1}</span>
                            </div>
                            <p className="ml-3 text-sm text-gray-700">{recommendation}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Feedback section */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Feedback</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Help improve our analysis by providing feedback
                  </p>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Was this analysis accurate? Your feedback helps our system learn and improve.
                    </p>
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Yes, it was accurate
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        No, it was incorrect
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
