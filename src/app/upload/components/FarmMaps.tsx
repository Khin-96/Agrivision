"use client";

import dynamic from "next/dynamic";
import { Loader, AlertTriangle } from "lucide-react";
import React from "react";

// Dynamically import map to avoid SSR issues
const FarmMapInner = dynamic(() => import("./FarmMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Loading farm map...</p>
      </div>
    </div>
  ),
});

interface FarmMapsProps {
  layer?: "rgb" | "ndvi" | "ndwi" | "temperature";
  showAnalysis?: boolean;
  onLocationChange?: (coords: [number, number]) => void;
  onError?: (error: string) => void;
  center?: [number, number];
}

// Error boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: string) => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onError?: (error: string) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[FarmMaps Error Boundary]:', error, errorInfo);
    this.props.onError?.(error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-[600px] bg-red-50 flex items-center justify-center">
          <div className="text-center p-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Failed to load map
            </h3>
            <p className="text-red-600">{this.state.error?.message}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function FarmMaps({
  layer = "rgb",
  showAnalysis = false,
  onLocationChange,
  onError,
  center = [-1.286389, 36.817223], // default Nairobi
}: FarmMapsProps) {
  return (
    <MapErrorBoundary onError={onError}>
      <FarmMapInner
        layer={layer}
        showAnalysis={showAnalysis}
        onLocationChange={onLocationChange}
        center={center}
      />
    </MapErrorBoundary>
  );
}
