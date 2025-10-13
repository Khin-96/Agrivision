
// app/results/[analysisId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { motion } from 'framer-motion';

interface AnalysisData {
  gemini?: any;
  grok?: any;
  metadata?: any;
  file?: string;
  fileType?: string;
}

export default function ResultsPage() {
  const params = useParams();
  const { analysisId } = params;
  const [data, setData] = useState<AnalysisData | null>(null);
  const [combinedAnalysis, setCombinedAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!analysisId) return;

    const fetchAnalysisData = async () => {
      try {
        const response = await fetch(`/api/analysis/${analysisId}`);
        if (response.ok) {
          const resultData = await response.json();
          setData(resultData);
          
          // Combine analysis from both AI models
          if (resultData.gemini || resultData.grok) {
            const combined = {
              plantName: resultData.grok?.plantIdentification?.species || resultData.gemini?.plantIdentification?.species || "Unknown Plant",
              healthStatus: resultData.gemini?.health || resultData.grok?.health || "Needs assessment",
              identificationConfidence: resultData.grok?.plantIdentification?.confidence || resultData.gemini?.plantIdentification?.confidence || "Moderate",
              diseases: resultData.gemini?.detectedDiseases || resultData.grok?.detectedDiseases || [],
              recommendations: [
                ...(resultData.gemini?.recommendations || []),
                ...(resultData.grok?.recommendations || [])
              ],
              growingConditions: resultData.grok?.growingConditions || resultData.gemini?.growingConditions || "Standard conditions",
              additionalInfo: resultData.grok?.additionalInfo || resultData.gemini?.additionalInfo || ""
            };
            
            setCombinedAnalysis(combined);
          }
        } else {
          console.error('Failed to fetch analysis data');
        }
      } catch (error) {
        console.error('Error fetching analysis:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysisData();
  }, [analysisId]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-600">Loading analysis...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data || !combinedAnalysis) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-600">Analysis not found</p>
            <button
              onClick={() => window.location.href = '/upload'}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Analyze New Plant
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Plant Analysis Results
          </h1>
          <p className="text-gray-600">Comprehensive assessment of your plant's health and needs</p>
        </div>

        {/* File Preview */}
        {data.file && (
          <div className="flex justify-center mb-10">
            {data.fileType?.startsWith('video/') ? (
              <video
                src={data.file}
                controls
                className="max-h-96 rounded-lg shadow-md"
              />
            ) : (
              <img
                src={data.file}
                alt="Analyzed Plant"
                className="max-h-96 rounded-lg shadow-md"
              />
            )}
          </div>
        )}

        {/* Combined Analysis Results */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-10">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Analysis Summary</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Plant Identification</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Species</p>
                    <p className="font-medium">{combinedAnalysis.plantName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Confidence Level</p>
                    <p className="font-medium capitalize">{combinedAnalysis.identificationConfidence}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Optimal Growing Conditions</p>
                    <p className="font-medium">{combinedAnalysis.growingConditions}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Health Assessment</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Overall Status</p>
                    <p className="font-medium">{combinedAnalysis.healthStatus}</p>
                  </div>
                  {combinedAnalysis.diseases.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500">Detected Issues</p>
                      <ul className="list-disc pl-5 mt-1">
                        {combinedAnalysis.diseases.map((disease: string, i: number) => (
                          <li key={i} className="font-medium text-red-600">{disease}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Care Recommendations</h3>
              <ul className="space-y-3">
                {combinedAnalysis.recommendations.map((rec: string, i: number) => (
                  <motion.li 
                    key={i}
                    className="flex items-start"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5 mr-3">✓</span>
                    <span>{rec}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            
            {combinedAnalysis.additionalInfo && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Additional Insight</h4>
                <p className="text-green-700">{combinedAnalysis.additionalInfo}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => window.location.href = '/upload'}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Analyze Another Plant
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Print Report
          </button>
        </div>
      </div>
    </Layout>
  );
}