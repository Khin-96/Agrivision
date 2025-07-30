'use client';

import { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

interface MLModelProps {
  modelUrl: string;
  imageElement: HTMLImageElement | null;
  onPredictionComplete: (results: any) => void;
  onError: (error: Error) => void;
}

export default function useMLModel() {
  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load the model
  const loadModel = async (modelUrl: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load the TensorFlow.js model
      const loadedModel = await tf.loadGraphModel(modelUrl);
      setModel(loadedModel);
      return loadedModel;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load model');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Run prediction on an image
  const runPrediction = async (
    imageElement: HTMLImageElement,
    modelToUse: tf.GraphModel | null = model
  ) => {
    if (!modelToUse) {
      throw new Error('Model not loaded');
    }

    try {
      // Preprocess the image
      const tensor = tf.browser.fromPixels(imageElement)
        .resizeNearestNeighbor([224, 224]) // Resize to model input size
        .toFloat()
        .expandDims(0); // Add batch dimension
      
      // Normalize the image if needed (depends on model)
      const normalized = tensor.div(255.0);
      
      // Run the prediction
      const predictions = await modelToUse.predict(normalized);
      
      // Process the output based on model type
      let results;
      if (Array.isArray(predictions)) {
        results = await Promise.all(predictions.map(p => p.data()));
      } else {
        results = await predictions.data();
      }
      
      // Clean up tensors
      tf.dispose([tensor, normalized]);
      if (Array.isArray(predictions)) {
        predictions.forEach(p => p.dispose());
      } else {
        predictions.dispose();
      }
      
      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Prediction failed');
      throw error;
    }
  };

  // Check for model updates
  const checkModelVersion = async (versionUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(versionUrl);
      const data = await response.json();
      
      // Compare with stored version (could be in localStorage)
      const currentVersion = localStorage.getItem('modelVersion') || '0';
      
      if (data.version > currentVersion) {
        localStorage.setItem('modelVersion', data.version);
        return true; // Model needs update
      }
      
      return false; // No update needed
    } catch (err) {
      console.error('Failed to check model version:', err);
      return false;
    }
  };

  return {
    model,
    isLoading,
    error,
    loadModel,
    runPrediction,
    checkModelVersion
  };
}
