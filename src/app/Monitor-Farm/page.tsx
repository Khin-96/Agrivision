// app/Monitor-Farm/page.tsx
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Layout from "@/components/layout/Layout";

// Dynamically import components to avoid SSR issues
const FarmMapInner = dynamic(() => import("./component/FarmMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Farm Intelligence...</p>
      </div>
    </div>
  )
});

// Dynamically import chat widget to avoid SSR issues
const ChatWidget = dynamic(() => import("./component/chatWidget"), {
  ssr: false,
  loading: () => null // Chat widget doesn't need a loading state
});

type LayerType = "rgb" | "ndvi" | "ndwi" | "temperature";

export default function MonitorFarmPage() {
  const [center, setCenter] = useState<[number, number]>([-1.286389, 36.817223]);
  const [currentLayer, setCurrentLayer] = useState<LayerType>("ndvi");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>("Getting location...");

  // Get user's GPS location with enhanced error handling
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Using default location (Nairobi)");
      setLoading(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // Cache for 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCenter: [number, number] = [
          position.coords.latitude,
          position.coords.longitude
        ];
        setCenter(newCenter);
        setLocationStatus("Using your current location");
        setLoading(false);
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        // Fallback to Nairobi coordinates
        setCenter([-1.286389, 36.817223]);
        setLocationStatus("Using default location (Nairobi)");
        setLoading(false);
      },
      options
    );
  }, []);

  // Handle location changes from the map component
  const handleLocationChange = (coords: [number, number]) => {
    setCenter(coords);
    setLocationStatus(`Location updated: ${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`);
  };

  // Layer switching handler
  const handleLayerChange = (layer: LayerType) => {
    setCurrentLayer(layer);
  };

  // Manual coordinate input handler
  const handleManualLocationInput = () => {
    const latInput = prompt("Enter latitude:");
    const lngInput = prompt("Enter longitude:");
    
    if (latInput && lngInput) {
      const lat = parseFloat(latInput);
      const lng = parseFloat(lngInput);
      
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const newCenter: [number, number] = [lat, lng];
        setCenter(newCenter);
        setLocationStatus(`Manual location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } else {
        alert("Invalid coordinates. Please enter valid latitude (-90 to 90) and longitude (-180 to 180) values.");
      }
    }
  };

  // Error boundary for the map
  if (error) {
    return (
      <Layout>
        <div className="h-screen bg-red-50 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Farm Monitor</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <Layout>
        <div className="h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 mb-2">Initializing Farm Intelligence</p>
            <p className="text-sm text-gray-500">{locationStatus}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen flex flex-col bg-slate-50">
        {/* Header Section */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Farm Intelligence Dashboard</h1>
              <p className="text-sm text-gray-600">Real-time monitoring and analysis</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Data</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Sidebar - Layer Controls */}
          <aside className="w-full lg:w-80 bg-white border-r border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Map Layers</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "rgb" as LayerType, label: "RGB", color: "bg-green-500", icon: "🌾" },
                  { key: "ndvi" as LayerType, label: "NDVI", color: "bg-blue-500", icon: "📊" },
                  { key: "ndwi" as LayerType, label: "NDWI", color: "bg-cyan-500", icon: "💧" },
                  { key: "temperature" as LayerType, label: "Temperature", color: "bg-orange-500", icon: "🌡️" },
                ].map(({ key, label, color, icon }) => (
                  <button
                    key={key}
                    onClick={() => handleLayerChange(key)}
                    className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                      currentLayer === key
                        ? `${color} text-white shadow-md`
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <span className="text-lg mb-1">{icon}</span>
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">Location Controls</h3>
              <div className="space-y-2">
                <button
                  onClick={handleManualLocationInput}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Set Custom Location
                </button>
                
                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      setLocationStatus("Getting your location...");
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          const newCenter: [number, number] = [
                            position.coords.latitude,
                            position.coords.longitude
                          ];
                          setCenter(newCenter);
                          setLocationStatus("Location updated");
                        },
                        () => {
                          setLocationStatus("Could not get location");
                        }
                      );
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh GPS Location
                </button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-md font-medium text-blue-800 mb-2">Current Status</h3>
              <p className="text-sm text-blue-600 mb-2">{locationStatus}</p>
              <div className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded">
                {center[0].toFixed(4)}, {center[1].toFixed(4)}
              </div>
            </div>
          </aside>

          {/* Map Area */}
          <main className="flex-1 relative">
            <FarmMapInner
              layer={currentLayer}
              showAnalysis={true}
              onLocationChange={handleLocationChange}
              center={center}
            />
          </main>
        </div>

        {/* AI Chat Widget */}
        <ChatWidget 
          position="bottom-right"
          className="mr-6 mb-6"
          apiEndpoint="/api/farmbot"
        />
      </div>
    </Layout>
  );
}