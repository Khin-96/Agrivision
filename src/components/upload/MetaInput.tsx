'use client';

import { useState, useEffect } from 'react';

interface MetaInputProps {
  onMetaDataChange: (data: Record<string, string>) => void;
  enableAutoDetect?: boolean;
}

export default function MetaInput({ onMetaDataChange, enableAutoDetect = false }: MetaInputProps) {
  const [plantType, setPlantType] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [symptoms, setSymptoms] = useState<string>('');
  const [plantAge, setPlantAge] = useState<string>('');
  const [isAutoDetect, setIsAutoDetect] = useState<boolean>(false);

  // Common plant types
  const plantTypes = [
    { value: '', label: 'Select plant type' },
    { value: 'tomato', label: 'Tomato' },
    { value: 'potato', label: 'Potato' },
    { value: 'corn', label: 'Corn' },
    { value: 'apple', label: 'Apple' },
    { value: 'grape', label: 'Grape' },
    { value: 'strawberry', label: 'Strawberry' },
    { value: 'pepper', label: 'Pepper' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'peach', label: 'Peach' },
    { value: 'orange', label: 'Orange' },
    { value: 'soybean', label: 'Soybean' },
    { value: 'squash', label: 'Squash' },
    { value: 'unknown', label: 'I don\'t know (auto-detect)' }
  ];

  // Update parent component with metadata changes
  useEffect(() => {
    onMetaDataChange({
      plantType: isAutoDetect ? 'unknown' : plantType,
      location,
      symptoms,
      plantAge,
      isAutoDetect: isAutoDetect.toString()
    });
  }, [plantType, location, symptoms, plantAge, isAutoDetect, onMetaDataChange]);

  // Handle auto-detect toggle
  const handleAutoDetectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsAutoDetect(checked);
    if (checked) {
      setPlantType('unknown');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-gray-900">Plant Details</h2>
      <p className="text-sm text-gray-500">
        Provide information about your plant to help with analysis.
      </p>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* Plant Type Selection */}
        <div className="sm:col-span-3">
          <label htmlFor="plant-type" className="block text-sm font-medium text-gray-700">
            Plant Type
          </label>
          <div className="mt-1">
            <select
              id="plant-type"
              name="plant-type"
              value={isAutoDetect ? 'unknown' : plantType}
              onChange={(e) => setPlantType(e.target.value)}
              disabled={isAutoDetect}
              className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
            >
              {plantTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Plant Age */}
        <div className="sm:col-span-3">
          <label htmlFor="plant-age" className="block text-sm font-medium text-gray-700">
            Plant Age (optional)
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="plant-age"
              id="plant-age"
              value={plantAge}
              onChange={(e) => setPlantAge(e.target.value)}
              placeholder="e.g., 3 months"
              className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Location */}
        <div className="sm:col-span-6">
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Growing Location (optional)
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="location"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Indoor pot, garden, greenhouse"
              className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Symptoms */}
        <div className="sm:col-span-6">
          <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">
            Observed Symptoms (optional)
          </label>
          <div className="mt-1">
            <textarea
              id="symptoms"
              name="symptoms"
              rows={3}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Describe any symptoms you've noticed, e.g., yellow leaves, spots, wilting"
              className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Auto-detect option */}
        {enableAutoDetect && (
          <div className="sm:col-span-6">
            <div className="flex items-center">
              <input
                id="auto-detect"
                name="auto-detect"
                type="checkbox"
                checked={isAutoDetect}
                onChange={handleAutoDetectChange}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="auto-detect" className="ml-2 block text-sm text-gray-900">
                I don't know the plant type (use automatic plant identification)
              </label>
            </div>
            {isAutoDetect && (
              <p className="mt-2 text-sm text-gray-500">
                Our AI will attempt to identify your plant before analyzing for diseases.
                For best results, upload a clear image showing distinctive features of the plant.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
