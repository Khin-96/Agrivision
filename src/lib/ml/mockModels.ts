'use client';

import { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

// Mock data for plant classes and disease classes
const mockPlantClasses = [
  'Apple', 'Blueberry', 'Cherry', 'Corn', 'Grape', 
  'Orange', 'Peach', 'Pepper', 'Potato', 'Raspberry',
  'Soybean', 'Squash', 'Strawberry', 'Tomato'
];

const mockDiseaseClasses = {
  'Apple': [
    { index: 1, name: 'Apple Scab', isHealthy: false },
    { index: 2, name: 'Black Rot', isHealthy: false },
    { index: 3, name: 'Cedar Apple Rust', isHealthy: false },
    { index: 0, name: 'Healthy', isHealthy: true }
  ],
  'Tomato': [
    { index: 4, name: 'Early Blight', isHealthy: false },
    { index: 5, name: 'Late Blight', isHealthy: false },
    { index: 6, name: 'Leaf Mold', isHealthy: false },
    { index: 7, name: 'Septoria Leaf Spot', isHealthy: false },
    { index: 8, name: 'Spider Mites', isHealthy: false },
    { index: 9, name: 'Target Spot', isHealthy: false },
    { index: 10, name: 'Yellow Leaf Curl Virus', isHealthy: false },
    { index: 11, name: 'Mosaic Virus', isHealthy: false },
    { index: 0, name: 'Healthy', isHealthy: true }
  ],
  'Potato': [
    { index: 12, name: 'Early Blight', isHealthy: false },
    { index: 13, name: 'Late Blight', isHealthy: false },
    { index: 0, name: 'Healthy', isHealthy: true }
  ],
  'Corn': [
    { index: 14, name: 'Cercospora Leaf Spot', isHealthy: false },
    { index: 15, name: 'Common Rust', isHealthy: false },
    { index: 16, name: 'Northern Leaf Blight', isHealthy: false },
    { index: 0, name: 'Healthy', isHealthy: true }
  ],
  'Grape': [
    { index: 17, name: 'Black Rot', isHealthy: false },
    { index: 18, name: 'Esca (Black Measles)', isHealthy: false },
    { index: 19, name: 'Leaf Blight', isHealthy: false },
    { index: 0, name: 'Healthy', isHealthy: true }
  ]
};

// Mock recommendations for common diseases
const mockRecommendations = {
  'Apple Scab': [
    'Remove and destroy infected leaves and fruit',
    'Apply fungicide early in the growing season',
    'Ensure proper spacing between trees for air circulation',
    'Prune trees to improve air flow'
  ],
  'Early Blight': [
    'Remove infected leaves immediately',
    'Apply copper-based fungicide',
    'Mulch around plants to prevent soil splash',
    'Rotate crops yearly to prevent buildup of pathogens'
  ],
  'Late Blight': [
    'Remove and destroy all infected plant parts',
    'Apply fungicide preventatively in humid conditions',
    'Ensure proper plant spacing for air circulation',
    'Water at the base of plants, avoid wetting foliage'
  ],
  'Common Rust': [
    'Apply fungicide at first sign of infection',
    'Plant rust-resistant varieties when possible',
    'Ensure proper air circulation between plants',
    'Rotate corn crops with non-host plants'
  ],
  'Healthy': [
    'Continue regular watering schedule',
    'Maintain proper fertilization',
    'Monitor for early signs of pest or disease issues',
    'Ensure adequate sunlight exposure'
  ]
};

// Create mock model files for plant identification and disease detection
export async function createMockModelFiles() {
  try {
    // Create directories for model files
    await fetch('/api/create-directories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        directories: [
          '/models/plant_identification',
          '/models/disease_detection'
        ]
      })
    });

    // Create mock classes.json files
    await fetch('/api/write-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: '/models/plant_identification/classes.json',
        content: JSON.stringify(mockPlantClasses)
      })
    });

    await fetch('/api/write-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: '/models/disease_detection/classes.json',
        content: JSON.stringify(mockDiseaseClasses)
      })
    });

    // Create mock model.json files with minimal structure
    const mockPlantModelJson = {
      format: 'layers-model',
      generatedBy: 'AgriVision Mock',
      convertedBy: 'TensorFlow.js Converter',
      modelTopology: {},
      weightsManifest: [
        {
          paths: ['weights.bin'],
          weights: []
        }
      ]
    };

    await fetch('/api/write-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: '/models/plant_identification/model.json',
        content: JSON.stringify(mockPlantModelJson)
      })
    });

    await fetch('/api/write-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: '/models/disease_detection/model.json',
        content: JSON.stringify(mockPlantModelJson)
      })
    });

    // Create empty weights.bin files
    const emptyArrayBuffer = new ArrayBuffer(0);
    const emptyBlob = new Blob([emptyArrayBuffer]);
    
    const plantWeightsFormData = new FormData();
    plantWeightsFormData.append('file', emptyBlob, 'weights.bin');
    plantWeightsFormData.append('path', '/models/plant_identification/weights.bin');
    
    await fetch('/api/upload-file', {
      method: 'POST',
      body: plantWeightsFormData
    });
    
    const diseaseWeightsFormData = new FormData();
    diseaseWeightsFormData.append('file', emptyBlob, 'weights.bin');
    diseaseWeightsFormData.append('path', '/models/disease_detection/weights.bin');
    
    await fetch('/api/upload-file', {
      method: 'POST',
      body: diseaseWeightsFormData
    });

    // Create recommendations.json file
    await fetch('/api/write-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: '/models/disease_detection/recommendations.json',
        content: JSON.stringify(mockRecommendations)
      })
    });

    console.log('Mock model files created successfully');
    return true;
  } catch (error) {
    console.error('Error creating mock model files:', error);
    return false;
  }
}

// Mock model loading and inference functions
export function createMockModelFunctions() {
  // Mock plant identification model
  const mockIdentifyPlant = async (imageElement) => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return a random plant from the mock classes with high confidence
    const randomIndex = Math.floor(Math.random() * mockPlantClasses.length);
    const plantClass = mockPlantClasses[randomIndex];
    
    return {
      className: plantClass,
      probability: 0.85 + (Math.random() * 0.15) // Random confidence between 85% and 100%
    };
  };
  
  // Mock disease detection model
  const mockDetectDisease = async (imageElement, plantType = null) => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let diseaseResult;
    
    if (plantType && mockDiseaseClasses[plantType]) {
      // If plant type is known, return a disease specific to that plant
      const plantDiseases = mockDiseaseClasses[plantType];
      const randomIndex = Math.floor(Math.random() * plantDiseases.length);
      const disease = plantDiseases[randomIndex];
      
      diseaseResult = {
        diseaseName: disease.name,
        probability: 0.75 + (Math.random() * 0.2), // Random confidence between 75% and 95%
        isHealthy: disease.isHealthy,
        plantType: plantType,
        recommendations: mockRecommendations[disease.name] || []
      };
    } else {
      // If plant type is unknown, return a generic healthy result
      diseaseResult = {
        diseaseName: 'Healthy',
        probability: 0.8 + (Math.random() * 0.15),
        isHealthy: true,
        plantType: 'Unknown',
        recommendations: mockRecommendations['Healthy']
      };
    }
    
    return diseaseResult;
  };
  
  return {
    mockIdentifyPlant,
    mockDetectDisease
  };
}

// Initialize TensorFlow.js
export async function initTensorFlow() {
  try {
    await tf.ready();
    console.log('TensorFlow.js initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing TensorFlow.js:', error);
    return false;
  }
}
