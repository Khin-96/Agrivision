// src/lib/api.ts
export interface AnalysisResponse {
  success: boolean;
  analysis?: string;
  error?: string;
  filename?: string;
  type?: string;
  categories?: string[];
  suggestions?: string[];
  risks?: string[];
  didYouKnow?: string[];
}

export async function analyzeFarmContent(file: File, type: 'image' | 'video'): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  try {
    const response = await fetch('/api/farm-activities/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}