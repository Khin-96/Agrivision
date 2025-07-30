'use client';

import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

// Custom hook for plant identification and disease detection
export default function useMLAnalysis() {
  const [plantIdentificationModel, setPlantIdentificationModel] = useState(null);
  const [diseaseDetectionModel, setDiseaseDetectionModel] = useState(null);
  const [knnModel, setKnnModel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plantClasses, setPlantClasses] = useState([]);
  const [diseaseClasses, setDiseaseClasses] = useState({});
  
  // Load plant identification model (MobileNet)
  const loadPlantIdentificationModel = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load MobileNet model
      const model = await mobilenet.load({
        version: 2,
        alpha: 1.0
      });
      
      // Initialize KNN Classifier for transfer learning
      const classifier = knnClassifier.create();
      
      setPlantIdentificationModel(model);
      setKnnModel(classifier);
      
      // Load plant classes
      const response = await fetch('/models/plant_identification/classes.json');
      const classes = await response.json();
      setPlantClasses(classes);
      
      return { model, classifier, classes };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load plant identification model';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load disease detection model (CropNet converted to TensorFlow.js)
  const loadDiseaseDetectionModel = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load disease detection model
      const model = await tf.loadGraphModel('/models/disease_detection/model.json');
      setDiseaseDetectionModel(model);
      
      // Load disease classes
      const response = await fetch('/models/disease_detection/classes.json');
      const classes = await response.json();
      setDiseaseClasses(classes);
      
      return { model, classes };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load disease detection model';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Identify plant from image
  const identifyPlant = async (imageElement) => {
    if (!plantIdentificationModel) {
      throw new Error('Plant identification model not loaded');
    }
    
    try {
      // Get features from MobileNet
      const activation = plantIdentificationModel.infer(imageElement, true);
      
      // If KNN has examples, use it for better classification
      if (knnModel && knnModel.getNumClasses() > 0) {
        const result = await knnModel.predictClass(activation);
        return {
          className: plantClasses[result.label],
          probability: result.confidences[result.label]
        };
      }
      
      // Otherwise use MobileNet's classification
      const predictions = await plantIdentificationModel.classify(imageElement);
      
      // Map ImageNet classes to plant classes if possible
      const topPrediction = predictions[0];
      const matchedPlant = mapImageNetToPlant(topPrediction.className);
      
      return {
        className: matchedPlant || topPrediction.className,
        probability: topPrediction.probability
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to identify plant';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };
  
  // Detect disease from image
  const detectDisease = async (imageElement, plantType = null) => {
    if (!diseaseDetectionModel) {
      throw new Error('Disease detection model not loaded');
    }
    
    try {
      // Preprocess the image
      const tensor = tf.browser.fromPixels(imageElement)
        .resizeNearestNeighbor([224, 224]) // Resize to model input size
        .toFloat()
        .expandDims(0); // Add batch dimension
      
      // Normalize the image
      const normalized = tensor.div(255.0);
      
      // Run the prediction
      const predictions = await diseaseDetectionModel.predict(normalized);
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
      
      // Process results
      const classIndices = Array.from(results)
        .map((prob, index) => ({ probability: prob, index }))
        .sort((a, b) => b.probability - a.probability);
      
      // Filter by plant type if provided
      let filteredResults = classIndices;
      if (plantType && diseaseClasses[plantType]) {
        filteredResults = classIndices.filter(item => 
          diseaseClasses[plantType].some(disease => 
            disease.index === item.index
          )
        );
      }
      
      // Get top result
      const topResult = filteredResults[0];
      const diseaseInfo = getDiseaseInfo(topResult.index, plantType);
      
      return {
        diseaseName: diseaseInfo.name,
        probability: topResult.probability,
        isHealthy: diseaseInfo.isHealthy,
        plantType: diseaseInfo.plantType,
        recommendations: diseaseInfo.recommendations || []
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to detect disease';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };
  
  // Helper function to map ImageNet classes to plant types
  const mapImageNetToPlant = (imageNetClass) => {
    // This would be replaced with actual mapping logic
    // For now, return a simple mapping for common plants
    const mapping = {
      'corn': 'Corn',
      'maize': 'Corn',
      'tomato': 'Tomato',
      'potato': 'Potato',
      'apple': 'Apple',
      'grape': 'Grape',
      'orange': 'Orange',
      'strawberry': 'Strawberry'
    };
    
    // Check if any key in the mapping is in the ImageNet class
    for (const [key, value] of Object.entries(mapping)) {
      if (imageNetClass.toLowerCase().includes(key)) {
        return value;
      }
    }
    
    return null;
  };
  
  // Helper function to get disease info from index
  const getDiseaseInfo = (index, plantType = null) => {
    // This would be replaced with actual disease info lookup
    // For now, return mock data
    const mockDiseases = {
      0: {
        name: 'Healthy',
        isHealthy: true,
        plantType: 'Generic',
        recommendations: ['Regular watering', 'Proper sunlight exposure']
      },
      1: {
        name: 'Early Blight',
        isHealthy: false,
        plantType: 'Tomato',
        recommendations: [
          'Remove affected leaves',
          'Apply fungicide',
          'Ensure proper spacing between plants',
          'Water at the base of plants'
        ]
      },
      2: {
        name: 'Late Blight',
        isHealthy: false,
        plantType: 'Potato',
        recommendations: [
          'Remove infected plants',
          'Apply copper-based fungicide',
          'Improve air circulation',
          'Avoid overhead watering'
        ]
      }
    };
    
    return mockDiseases[index] || {
      name: 'Unknown Disease',
      isHealthy: false,
      plantType: plantType || 'Unknown',
      recommendations: ['Consult with a plant specialist']
    };
  };
  
  // Perform complete analysis (plant identification + disease detection)
  const analyzeImage = async (imageElement, knownPlantType = null) => {
    try {
      setIsLoading(true);
      setError(null);
      
      let plantType = knownPlantType;
      let plantIdentification = null;
      
      // Step 1: Identify plant if type is not provided
      if (!plantType) {
        plantIdentification = await identifyPlant(imageElement);
        plantType = plantIdentification.className;
      }
      
      // Step 2: Detect disease
      const diseaseDetection = await detectDisease(imageElement, plantType);
      
      return {
        plantIdentification: plantIdentification || { className: plantType, probability: 1.0 },
        diseaseDetection
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to analyze image';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    loadPlantIdentificationModel,
    loadDiseaseDetectionModel,
    identifyPlant,
    detectDisease,
    analyzeImage,
    plantIdentificationModel,
    diseaseDetectionModel,
    knnModel,
    isLoading,
    error,
    plantClasses,
    diseaseClasses
  };
}
