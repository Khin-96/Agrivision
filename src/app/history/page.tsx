'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import useMLAnalysis from '@/hooks/useMLAnalysis';

export default function HistoryPage() {
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // Load history on component mount
  useEffect(() => {
    const loadHistory = () => {
      const history = JSON.parse(localStorage.getItem('analysis-history') || '[]');
      setHistoryItems(history);
    };
    
    loadHistory();
  }, []);

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold text-gray-900">Analysis History</h1>
        <p className="mt-2 text-lg text-gray-500">
          View your previous plant analyses
        </p>

        {historyItems.length === 0 ? (
          <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-12 sm:px-6 flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No analysis history</h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload and analyze plant images to see your history here.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Analyses</h3>
                </div>
                <div className="border-t border-gray-200">
                  <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {historyItems.map((item) => (
                      <li 
                        key={item.id}
                        className={`px-4 py-4 sm:px-6 cursor-pointer hover:bg-gray-50 ${
                          selectedItem?.id === item.id ? 'bg-green-50' : ''
                        }`}
                        onClick={() => handleSelectItem(item)}
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12 rounded-md overflow-hidden bg-gray-100">
                            <img 
                              src={item.imageUrl} 
                              alt="Plant thumbnail" 
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900">
                              {item.results.plantIdentification.className}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(item.date)}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.results.diseaseDetection.isHealthy 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {item.results.diseaseDetection.isHealthy 
                                ? 'Healthy' 
                                : 'Issue Detected'}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedItem ? (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Analysis Details
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(selectedItem.date)}
                    </p>
                  </div>
                  <div className="border-t border-gray-200">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden bg-gray-100">
                            <img 
                              src={selectedItem.imageUrl} 
                              alt="Analyzed plant" 
                              className="object-cover"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Plant Type</h4>
                            <p className="mt-1 text-lg font-semibold text-gray-900">
                              {selectedItem.results.plantIdentification.className}
                              {selectedItem.metadata.isAutoDetectPlant === 'true' && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Auto-detected
                                </span>
                              )}
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Health Status</h4>
                            <p className="mt-1 text-lg font-semibold text-gray-900">
                              {selectedItem.results.diseaseDetection.isHealthy 
                                ? 'Healthy' 
                                : selectedItem.results.diseaseDetection.diseaseName}
                            </p>
                          </div>
                          
                          {selectedItem.metadata.location && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">Growing Location</h4>
                              <p className="mt-1 text-sm text-gray-900">{selectedItem.metadata.location}</p>
                            </div>
                          )}
                          
                          {selectedItem.metadata.symptoms && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">Observed Symptoms</h4>
                              <p className="mt-1 text-sm text-gray-900">{selectedItem.metadata.symptoms}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Recommendations */}
                      {selectedItem.results.diseaseDetection.recommendations && 
                       selectedItem.results.diseaseDetection.recommendations.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-gray-500">Recommendations</h4>
                          <ul className="mt-2 divide-y divide-gray-200 border-t border-b border-gray-200">
                            {selectedItem.results.diseaseDetection.recommendations.map((recommendation: string, index: number) => (
                              <li key={index} className="py-3">
                                <div className="flex items-start">
                                  <span className="flex-shrink-0 h-5 w-5 text-green-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                  <p className="ml-2 text-sm text-gray-700">{recommendation}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-12 sm:px-6 flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Select an analysis</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Choose an analysis from the list to view details
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
