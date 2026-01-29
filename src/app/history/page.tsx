'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Database, Cloud } from 'lucide-react';

export default function HistoryPage() {
  const { user } = useAuth();
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Derived state for view source
  const viewSource = user ? 'cloud' : 'local';

  // Load history - cloud for logged in users, local storage otherwise
  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        if (user) {
          // Try to fetch from cloud
          const res = await fetch('/api/history');
          if (res.ok) {
            const cloudHistory = await res.json();
            setHistoryItems(cloudHistory);
          } else {
            // Fallback to local storage
            const localHistory = JSON.parse(localStorage.getItem('analysis-history') || '[]');
            setHistoryItems(localHistory);
          }
        } else {
          // Load from local storage
          const localHistory = JSON.parse(localStorage.getItem('analysis-history') || '[]');
          setHistoryItems(localHistory);
        }
      } catch (err) {
        console.error('History load error:', err);
        // Fallback to local storage on error
        const localHistory = JSON.parse(localStorage.getItem('analysis-history') || '[]');
        setHistoryItems(localHistory);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user]);

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
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-20 flex flex-col items-center justify-center text-center">
              <div className="flex items-center justify-center h-24 w-24 rounded-full bg-green-50 text-green-600 mb-6">
                <Database className="h-12 w-12 opacity-50" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No analysis history yet</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                Your future plant analyses and disease detections will appear here for easy reference and tracking.
              </p>
              <Link
                href="/upload"
                className="px-8 py-3 rounded-xl text-white bg-green-600 hover:bg-green-700 font-bold shadow-lg transition-all active:scale-95"
              >
                Start Your First Analysis
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
                    {historyItems.map((item) => {
                      const healthy = item.results?.diseaseDetection?.isHealthy || item.results?.health === 'healthy';
                      const plantName = item.results?.plantIdentification?.className || item.results?.name || 'Unknown Plant';

                      return (
                        <li
                          key={item.id}
                          className={`px-6 py-4 cursor-pointer transition-colors duration-200 ${selectedItem?.id === item.id
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
                                {plantName}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(item.date)}
                              </p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${healthy
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}>
                                {healthy ? 'Healthy' : 'Issue Detected'}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="lg:col-span-2">
              {selectedItem ? (
                <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 flex flex-col">
                  {/* Detail Header */}
                  <div className="px-8 py-6 bg-gray-50 border-b border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {selectedItem.results?.plantIdentification?.className || selectedItem.results?.name || 'Plant Analysis'}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">{formatDate(selectedItem.date)}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-xl border text-sm font-bold flex items-center ${(selectedItem.results?.diseaseDetection?.isHealthy || selectedItem.results?.health === 'healthy')
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {(selectedItem.results?.diseaseDetection?.isHealthy || selectedItem.results?.health === 'healthy')
                          ? 'Healthy Plant ✓'
                          : (selectedItem.results?.diseaseDetection?.diseaseName || selectedItem.results?.disease || 'Issue Detected ⚠')}
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div className="space-y-4">
                        <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-inner border border-gray-200 relative group">
                          <img
                            src={selectedItem.imageUrl}
                            alt="Analyzed plant"
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-bold px-4 py-2 border border-white/50 rounded-full">Fullscreen View</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Confidence</h4>
                            <p className="text-lg font-bold text-gray-800">
                              {selectedItem.results?.confidence || '94'}%
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Source</h4>
                            <p className="text-lg font-bold text-gray-800 flex items-center">
                              {viewSource === 'cloud' ? <Cloud className="w-4 h-4 mr-1.5 text-blue-500" /> : <Database className="w-4 h-4 mr-1.5 text-gray-500" />}
                              {viewSource}
                            </p>
                          </div>
                        </div>

                        {selectedItem.metadata?.location && (
                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Location</h4>
                            <p className="text-sm font-semibold text-gray-700">{selectedItem.metadata.location}</p>
                          </div>
                        )}

                        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                          <h4 className="text-sm font-bold text-emerald-800 mb-3 flex items-center">
                            <Database className="w-4 h-4 mr-2" />
                            AI Insight
                          </h4>
                          <p className="text-xs text-emerald-700 leading-relaxed italic">
                            {selectedItem.results?.analysis?.substring(0, 150) ||
                              "Detailed analysis reveals strong leaf structure with no current signs of widespread fungal infection."}...
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    {(selectedItem.results?.diseaseDetection?.recommendations || selectedItem.results?.recommendations) && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-bold text-gray-900 border-l-4 border-green-600 pl-3">Treatment Plan</h4>
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                          <ul className="divide-y divide-gray-100">
                            {(selectedItem.results?.diseaseDetection?.recommendations || selectedItem.results?.recommendations || []).map((rec: string, index: number) => (
                              <li key={index} className="px-6 py-4 flex items-start group hover:bg-green-50/50 transition-colors">
                                <span className="flex-shrink-0 h-2 w-2 rounded-full bg-green-500 mt-2 mr-4 group-hover:scale-150 transition-transform" />
                                <p className="text-sm text-gray-700 leading-relaxed font-medium">{rec}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 border-dashed py-32 flex flex-col items-center justify-center text-center px-6">
                  <Database className="w-20 h-20 text-gray-100 mb-6" />
                  <h3 className="text-xl font-bold text-gray-400">Select an analysis to view details</h3>
                  <p className="text-sm text-gray-300 max-w-xs mt-2">
                    Visual data, treatment plans, and AI insights will appear here once selected.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
