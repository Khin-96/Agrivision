'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import ImageUpload from '@/components/upload/ImageUpload';
import MetaInput from '@/components/upload/MetaInput';
import Preview from '@/components/upload/Preview';
import useMLAnalysis from '@/hooks/useMLAnalysis';

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'metadata' | 'preview'>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [isAutoDetectPlant, setIsAutoDetectPlant] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  
  // Get ML analysis hook
  const { 
    loadPlantIdentificationModel,
    loadDiseaseDetectionModel,
    isLoading: isMLLoading,
    error: mlError
  } = useMLAnalysis();

  // Load models on component mount
  useEffect(() => {
    const loadModels = async () => {
      setIsModelLoading(true);
      try {
        await Promise.all([
          loadPlantIdentificationModel(),
          loadDiseaseDetectionModel()
        ]);
      } catch (err) {
        setModelLoadError(err instanceof Error ? err.message : 'Failed to load ML models');
      } finally {
        setIsModelLoading(false);
      }
    };
    
    loadModels();
  }, [loadPlantIdentificationModel, loadDiseaseDetectionModel]);

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    
    // Create an image element for ML processing
    const img = new Image();
    img.onload = () => {
      setImageElement(img);
    };
    img.src = URL.createObjectURL(file);
    
    setStep('metadata');
  };

  const handleMetaDataChange = (data: Record<string, string>) => {
    setMetadata(data);
    
    // Set auto-detect flag if user doesn't know plant type
    setIsAutoDetectPlant(!data.plantType || data.plantType === 'unknown' || data.plantType === '');
  };

  const handleBack = () => {
    if (step === 'metadata') {
      setStep('upload');
    } else if (step === 'preview') {
      setStep('metadata');
    }
  };

  const handleNext = () => {
    if (step === 'metadata') {
      setStep('preview');
    }
  };

  const handleProceed = () => {
    // Generate a unique ID for this analysis
    const analysisId = `analysis-${Date.now()}`;
    
    // Store the image as a data URL and metadata
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      
      // Store image and metadata
      localStorage.setItem(`${analysisId}-image`, dataUrl);
      localStorage.setItem(`${analysisId}-metadata`, JSON.stringify({
        ...metadata,
        isAutoDetectPlant
      }));
      
      // Redirect to the results page
      router.push(`/results/${analysisId}`);
    };
    
    if (imageFile) {
      reader.readAsDataURL(imageFile);
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative w-full h-64 overflow-hidden bg-green-700">
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Plant <span className="text-green-300">Analysis</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-200">
            Upload a clear image of your plant to get an AI-powered analysis and diagnosis
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Model loading status */}
        {isModelLoading && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-800">
                  Loading plant analysis models...
                </p>
                <p className="mt-1 text-sm text-blue-600">
                  This may take a few moments. Please don't close this page.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Model loading error */}
        {modelLoadError && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-red-800">Error loading models</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{modelLoadError}</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Reload page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Progress Steps */}
          <div className="bg-green-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`flex items-center justify-center h-10 w-10 rounded-full ${
                  step === 'upload' ? 'bg-white text-green-700' : 'bg-green-600 text-white'
                } font-semibold shadow-md`}>
                  1
                </div>
                <span className={`ml-3 text-sm font-medium ${
                  step === 'upload' ? 'text-white' : 'text-green-200'
                }`}>
                  Upload
                </span>
              </div>
              
              <div className="hidden sm:block flex-1 mx-4">
                <div className="h-1 bg-green-600 rounded-full">
                  <div className={`h-1 bg-green-300 rounded-full transition-all duration-300 ${
                    step === 'upload' ? 'w-0' : step === 'metadata' ? 'w-1/2' : 'w-full'
                  }`}></div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className={`flex items-center justify-center h-10 w-10 rounded-full ${
                  step === 'metadata' ? 'bg-white text-green-700' : 
                  step === 'preview' ? 'bg-green-600 text-white' : 
                  'bg-green-800 text-green-200'
                } font-semibold shadow-md`}>
                  2
                </div>
                <span className={`ml-3 text-sm font-medium ${
                  step === 'metadata' || step === 'preview' ? 'text-white' : 'text-green-200'
                }`}>
                  Details
                </span>
              </div>
              
              <div className="hidden sm:block flex-1 mx-4">
                <div className="h-1 bg-green-600 rounded-full">
                  <div className={`h-1 bg-green-300 rounded-full transition-all duration-300 ${
                    step === 'preview' ? 'w-full' : 'w-0'
                  }`}></div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className={`flex items-center justify-center h-10 w-10 rounded-full ${
                  step === 'preview' ? 'bg-white text-green-700' : 'bg-green-800 text-green-200'
                } font-semibold shadow-md`}>
                  3
                </div>
                <span className={`ml-3 text-sm font-medium ${
                  step === 'preview' ? 'text-white' : 'text-green-200'
                }`}>
                  Review
                </span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="px-8 py-8">
            {step === 'upload' && (
              <ImageUpload onImageUpload={handleImageUpload} />
            )}

            {step === 'metadata' && (
              <div>
                <MetaInput 
                  onMetaDataChange={handleMetaDataChange} 
                  enableAutoDetect={true}
                />
                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-3 rounded-lg border border-transparent bg-green-600 text-white font-medium shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 'preview' && (
              <Preview
                imageFile={imageFile}
                metadata={{
                  ...metadata,
                  plantIdentification: isAutoDetectPlant ? 'Auto-detect plant type' : metadata.plantType
                }}
                onProceed={handleProceed}
              />
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-green-50 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-medium text-green-800 flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            For Best Results
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-green-700">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">•</span>
              Take clear, well-lit photos of the plant
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">•</span>
              Focus on leaves, stems, or affected areas
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">•</span>
              Include both healthy and unhealthy parts for comparison
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">•</span>
              Avoid shadows and ensure the image is in focus
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}