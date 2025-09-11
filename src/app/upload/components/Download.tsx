'use client';

import React from 'react';
import { Download as DownloadIcon, FileText } from 'lucide-react';
//import { AnalysisResult } from './types'; // adjust if you have a separate type file
import { exportAnalysisAsPDF, exportAllAnalysesAsPDF } from '../utils/pdfExport'; // import helpers

interface DownloadProps {
  analysisResults: AnalysisResult[];
  onDownloadAnalysis: (result: AnalysisResult) => void;
  onDownloadAllAnalyses: () => void;
}

export default function AnalysisDownload({
  analysisResults,
  onDownloadAnalysis,
  onDownloadAllAnalyses,
}: DownloadProps) {
  if (analysisResults.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800">Recent Analyses</h3>
        {analysisResults.length > 1 && (
          <button
            onClick={() => exportAllAnalysesAsPDF(analysisResults)}
            className="flex items-center gap-2 text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl shadow-lg transition"
          >
            <DownloadIcon size={18} />
            Download All PDFs
          </button>
        )}
      </div>

      {/* Analysis list */}
      <div className="space-y-5">
        {analysisResults.map((result, idx) => (
          <div
            key={idx}
            className="bg-white shadow-md rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition"
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <div>
                <h4 className="font-semibold text-gray-800">{result.filename}</h4>
                <p className="text-sm text-gray-500">
                  {result.type.toUpperCase()} • {new Date(result.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => onDownloadAnalysis(result)}
                  className="text-gray-600 hover:text-gray-800 transition"
                  title="Download as Text"
                >
                  <FileText size={18} />
                </button>
                <button
                  onClick={() => exportAnalysisAsPDF(result)}
                  className="text-gray-600 hover:text-gray-800 transition"
                  title="Download as PDF"
                >
                  <DownloadIcon size={18} />
                </button>
              </div>
            </div>

            {/* Preview */}
            {result.preview && (
              <div className="p-4 bg-gray-50 flex justify-center">
                {result.type === 'image' ? (
                  <img
                    src={result.preview}
                    alt={result.filename}
                    className="max-h-48 object-contain rounded-xl shadow-inner"
                  />
                ) : (
                  <video
                    src={result.preview}
                    controls
                    className="max-h-48 object-contain rounded-xl shadow-inner"
                  />
                )}
              </div>
            )}

            {/* Analysis Text */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                {result.analysis}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
