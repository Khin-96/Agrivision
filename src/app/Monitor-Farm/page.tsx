"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Layout from "@/components/layout/Layout";

// Dynamically import FarmMapInner to avoid SSR issues
const FarmMapInner = dynamic(() => import("./component/FarmMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Farm Intelligence...</p>
      </div>
    </div>
  ),
});

export default function MonitorFarmPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Optional: Get user location to pass to FarmMapInner if needed
  const [center, setCenter] = useState<[number, number]>([-1.286389, 36.817223]);
  const [locationStatus, setLocationStatus] = useState<string>("Getting location...");

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Using default location (Nairobi)");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter([position.coords.latitude, position.coords.longitude]);
        setLocationStatus("Using your current location");
        setLoading(false);
      },
      () => {
        setCenter([-1.286389, 36.817223]);
        setLocationStatus("Using default location (Nairobi)");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  if (error) {
    return (
      <Layout>
        <div className="h-screen bg-red-50 flex items-center justify-center">
          <div className="text-center p-8">
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
          </div>
        </header>

        {/* Main Map Area */}
        <main className="flex-1 relative">
          <FarmMapInner />
        </main>
      </div>
    </Layout>
  );
}
