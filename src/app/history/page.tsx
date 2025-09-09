'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';

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
      {/* Hero Section */}
      <div className="relative w-full h-64 overflow-hidden bg-green-700">
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Analysis <span className="text-green-300">History</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-200">
            Review your previous plant analyses and recommendations
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {historyItems.length === 0 ? (
          <div className="bg-white shadow-lg rounded-xl overflow-hidden">
            <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
              <div className="flex items-center justify-center h-24 w-24 rounded-full bg-green-100 text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-medium text-gray-900">No analysis history</h3>
              <p className="mt-2 text-sm text-gray-500">
                Upload and analyze plant images to see your history here.
              </p>
              <Link
                href="/upload"
                className="mt-6 px-6 py-3 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium shadow-md"
              >
                Upload Your First Image
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                <div className="px-6 py-5 bg-green-700">
                  <h3 className="text-lg font-medium text-white">Recent Analyses</h3>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  <ul className="divide-y divide-gray-200">
                    {historyItems.map((item) => (
                      <li 
                        key={item.id}
                        className={`px-6 py-4 cursor-pointer transition-colors duration-200 ${
                          selectedItem?.id === item.id 
                            ? 'bg-green-50 border-l-4 border-green-600' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelectItem(item)}
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-14 w-14 rounded-lg overflow-hidden bg-gray-100 shadow-sm">
                            <img 
                              src={item.imageUrl} 
                              alt="Plant thumbnail" 
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="ml-4 min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.results.plantIdentification.className}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(item.date)}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
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
                <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                  <div className="px-6 py-5 bg-green-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-white">
                        Analysis Details
                      </h3>
                      <span className="text-green-200 text-sm">
                        {formatDate(selectedItem.date)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="aspect-w-4 aspect-h-3 rounded-xl overflow-hidden bg-gray-100 shadow-md">
                          <img 
                            src={selectedItem.imageUrl} 
                            alt="Analyzed plant" 
                            className="object-cover w-full h-full"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-5">
                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="text-xs font-medium text-green-800 uppercase tracking-wider">Plant Type</h4>
                          <div className="flex items-center mt-1">
                            <p className="text-lg font-semibold text-gray-900">
                              {selectedItem.results.plantIdentification.className}
                            </p>
                            {selectedItem.metadata.isAutoDetectPlant === 'true' && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Auto-detected
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className={`rounded-lg p-4 ${
                          selectedItem.results.diseaseDetection.isHealthy 
                            ? 'bg-green-50' 
                            : 'bg-red-50'
                        }`}>
                          <h4 className="text-xs font-medium uppercase tracking-wider ${
                            selectedItem.results.diseaseDetection.isHealthy 
                              ? 'text-green-800' 
                              : 'text-red-800'
                          }">
                            Health Status
                          </h4>
                          <p className="mt-1 text-lg font-semibold ${
                            selectedItem.results.diseaseDetection.isHealthy 
                              ? 'text-green-900' 
                              : 'text-red-900'
                          }">
                            {selectedItem.results.diseaseDetection.isHealthy 
                              ? 'Healthy' 
                              : selectedItem.results.diseaseDetection.diseaseName}
                          </p>
                        </div>
                        
                        {selectedItem.metadata.location && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider">Growing Location</h4>
                            <p className="mt-1 text-sm text-gray-900">{selectedItem.metadata.location}</p>
                          </div>
                        )}
                        
                        {selectedItem.metadata.symptoms && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider">Observed Symptoms</h4>
                            <p className="mt-1 text-sm text-gray-900">{selectedItem.metadata.symptoms}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Recommendations */}
                    {selectedItem.results.diseaseDetection.recommendations && 
                     selectedItem.results.diseaseDetection.recommendations.length > 0 && (
                      <div className="mt-8">
                        <div className="bg-green-700 rounded-t-lg px-6 py-3">
                          <h4 className="text-sm font-medium text-white">Recommendations</h4>
                        </div>
                        <div className="bg-green-50 rounded-b-lg p-6 border border-green-200">
                          <ul className="space-y-3">
                            {selectedItem.results.diseaseDetection.recommendations.map((recommendation: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <span className="flex-shrink-0 h-5 w-5 text-green-600 mt-0.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                                <p className="ml-3 text-sm text-gray-700">{recommendation}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                  <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center justify-center h-24 w-24 rounded-full bg-green-100 text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="mt-6 text-xl font-medium text-gray-900">Select an analysis</h3>
                    <p className="mt-2 text-sm text-gray-500">
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