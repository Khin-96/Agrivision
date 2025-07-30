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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900">Upload Plant Image</h1>
          <p className="mt-2 text-lg text-gray-500">
            Upload a clear image of your plant to get an analysis and diagnosis.
          </p>

          {/* Model loading status */}
          {isModelLoading && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">
                    Loading plant analysis models...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Model loading error */}
          {modelLoadError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading models</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{modelLoadError}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="text-sm font-medium text-red-600 hover:text-red-500"
                    >
                      Reload page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
                    step === 'upload' ? 'bg-green-600' : 'bg-green-500'
                  } text-white`}>
                    1
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900">Upload</span>
                </div>
                <div className="hidden sm:block w-24 h-0.5 bg-gray-200"></div>
                <div className="flex items-center">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
                    step === 'metadata' ? 'bg-green-600' : step === 'preview' ? 'bg-green-500' : 'bg-gray-300'
                  } text-white`}>
                    2
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900">Details</span>
                </div>
                <div className="hidden sm:block w-24 h-0.5 bg-gray-200"></div>
                <div className="flex items-center">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
                    step === 'preview' ? 'bg-green-600' : 'bg-gray-300'
                  } text-white`}>
                    3
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900">Review</span>
                </div>
              </div>
            </div>

            {/* Step Content */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                {step === 'upload' && (
                  <ImageUpload onImageUpload={handleImageUpload} />
                )}

                {step === 'metadata' && (
                  <div>
                    <MetaInput 
                      onMetaDataChange={handleMetaDataChange} 
                      enableAutoDetect={true}
                    />
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Next
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
