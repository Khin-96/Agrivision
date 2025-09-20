//app/Monitor-Farm/component/FarmMapInner.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

// Dynamically import react-leaflet components (SSR disabled)
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Polygon = dynamic(() => import("react-leaflet").then(mod => mod.Polygon), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const FeatureGroup = dynamic(() => import("react-leaflet").then(mod => mod.FeatureGroup), { ssr: false });
const useMap = dynamic(() => import("react-leaflet").then(mod => mod.useMap), { ssr: false });
const EditControl = dynamic(() => import("react-leaflet-draw").then(mod => mod.EditControl), { ssr: false });

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface FarmZone {
  id: string;
  name: string;
  coordinates: [number, number][];
  ndvi: number;
  ndwi: number;
  temperature: number;
  soilMoisture: number;
  stressLevel: "low" | "medium" | "high";
  irrigationStatus: "adequate" | "insufficient" | "excessive";
  cropType: string;
}

interface FarmMapInnerProps {
  layer: "rgb" | "ndvi" | "ndwi" | "temperature";
  showAnalysis?: boolean;
  onLocationChange?: (coords: [number, number]) => void;
  center?: [number, number];
}

// MapPanTo component
const MapPanTo = ({ coords }: { coords: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(coords, 16, { duration: 1.5 });
  }, [coords, map]);
  return null;
};

// StressIndicator component
const StressIndicator = ({ level }: { level: "low" | "medium" | "high" }) => {
  const colors = { low: "#10b981", medium: "#f59e0b", high: "#ef4444" };
  const labels = { low: "Healthy", medium: "Monitor", high: "Critical" };
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[level] }} />
      <span className="text-sm font-medium">{labels[level]}</span>
    </div>
  );
};

export default function FarmMapInner({
  layer,
  showAnalysis = false,
  onLocationChange,
  center = [-1.286389, 36.817223],
}: FarmMapInnerProps) {
  const [isClient, setIsClient] = useState(false);
  const [zones, setZones] = useState<FarmZone[]>([]);
  const [tileUrl, setTileUrl] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<FarmZone | null>(null);
  const [clickedLocation, setClickedLocation] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [panCoords, setPanCoords] = useState<[number, number] | null>(null);
  const [drawingZones, setDrawingZones] = useState<FarmZone[]>([]);
  const [editingZone, setEditingZone] = useState<FarmZone | null>(null);
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  const stressColors = { low: "#10b981", medium: "#f59e0b", high: "#ef4444" };

  // Client-only rendering
  useEffect(() => setIsClient(true), []);

  // Debug info
  useEffect(() => setDebugInfo(`Center: ${center.join(', ')}, Layer: ${layer}`), [center, layer]);

  // Fetch farm data
  useEffect(() => {
    if (!isClient) return;
    async function fetchFarmData() {
      try {
        const res = await fetch(`/api/farm-monitor?lat=${center[0]}&lng=${center[1]}&type=${layer}`);
        const data = await res.json();
        if (data.success) {
          if (data.data.tileUrl) setTileUrl(data.data.tileUrl);
          if (data.data.zones) setZones(data.data.zones);
        }
      } catch (err) {
        console.error("Farm API error:", err);
      }
    }
    fetchFarmData();
  }, [layer, center, isClient]);

  // Search handler
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const results = await res.json();
      if (results.length > 0) {
        const { lat, lon } = results[0];
        const coords: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setClickedLocation(coords);
        setPanCoords(coords);
        onLocationChange?.(coords);
        setSelectedZone(null);
      } else alert("Location not found");
    } catch (err) {
      console.error("Search error:", err);
      alert("Search failed");
    }
  };

  // Draw handlers
  const handleCreated = (e: any) => {
    const layer = e.layer;
    if (layer instanceof L.Polygon) {
      const latlngs = layer.getLatLngs()[0].map((p: any) => [p.lat, p.lng]) as [number, number][];
      const newZone: FarmZone = {
        id: `zone-${Date.now()}`,
        name: "New Farm Zone",
        coordinates: latlngs,
        ndvi: Math.random() * 0.8 + 0.1,
        ndwi: Math.random() * 0.8 + 0.1,
        temperature: Math.random() * 10 + 20,
        soilMoisture: Math.random() * 40 + 30,
        stressLevel: "low",
        irrigationStatus: "adequate",
        cropType: "Mixed Crops",
      };
      setDrawingZones(prev => [...prev, newZone]);
      setEditingZone(newZone);
      setSelectedZone(newZone);
      setIsAnalysisPanelOpen(true);
    }
  };

  const handleDeleted = (e: any) => {
    e.layers.eachLayer((layer: any) => {
      setDrawingZones(prev =>
        prev.filter(z =>
          !z.coordinates.some(coord =>
            layer.getLatLngs()[0].some((p: any) => p.lat === coord[0] && p.lng === coord[1])
          )
        )
      );
      setSelectedZone(null);
      setEditingZone(null);
    });
  };

  const saveZone = () => {
    if (!editingZone) return;
    setDrawingZones(prev => prev.map(z => (z.id === editingZone.id ? editingZone : z)));
    setEditingZone(null);
  };

  if (!isClient) return <div className="h-full w-full bg-gray-50" />;

  return (
    <div className="h-full w-full bg-slate-50 relative overflow-hidden">
      <style jsx global>{`
        .leaflet-container { background: #f8fafc !important; }
        .leaflet-tile-pane, .leaflet-layer { opacity: 1 !important; }
      `}</style>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-900">Farm Intelligence</h2>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time monitoring</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
                className="w-64 pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-blue-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => setIsAnalysisPanelOpen(!isAnalysisPanelOpen)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Analysis
            </button>
          </div>
        </div>
        <div className="absolute top-16 left-4 z-50 bg-black/75 text-white text-xs px-2 py-1 rounded">
          {debugInfo}
        </div>
      </div>

      {/* Map */}
      <div className="h-full pt-16">
        <MapContainer
          center={center}
          zoom={16}
          style={{ height: "100%", width: "100%", minHeight: "400px" }}
          scrollWheelZoom
          className="z-10 leaflet-container"
        >
          <TileLayer 
            url={tileUrl || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
            attribution="&copy; OpenStreetMap contributors"
          />
          {panCoords && <MapPanTo coords={panCoords} />}
          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              position="topright"
              onCreated={handleCreated}
              onDeleted={handleDeleted}
              draw={{ rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false,
                polygon: { shapeOptions: { color: "#3b82f6", weight: 2, fillOpacity: 0.1 } } }}
            />
            {[...zones, ...drawingZones].map(zone => (
              <Polygon
                key={zone.id}
                pathOptions={{ color: stressColors[zone.stressLevel], weight: 3, fillOpacity: 0.2 }}
                positions={zone.coordinates.map(([lat, lng]) => [lat, lng])}
                eventHandlers={{ click: () => { setSelectedZone(zone); setIsAnalysisPanelOpen(true); setClickedLocation(null); } }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-semibold text-lg mb-2">{zone.name}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Crop:</span><span>{zone.cropType}</span></div>
                      <div className="flex justify-between"><span>NDVI:</span><span>{zone.ndvi.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Temp:</span><span>{zone.temperature.toFixed(1)}°C</span></div>
                      <div className="flex justify-between"><span>Status:</span><StressIndicator level={zone.stressLevel} /></div>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            ))}
            {clickedLocation && (
              <Marker position={clickedLocation} icon={customIcon}>
                <Popup>
                  <div className="text-sm">
                    <strong>Selected Location</strong><br/>
                    Lat: {clickedLocation[0].toFixed(5)}<br/>
                    Lng: {clickedLocation[1].toFixed(5)}
                  </div>
                </Popup>
              </Marker>
            )}
          </FeatureGroup>
        </MapContainer>
      </div>

      {/* Analysis Panel */}
      {isAnalysisPanelOpen && selectedZone && (
        <div className="absolute top-20 right-0 w-80 h-[70%] bg-white shadow-lg border-l border-gray-200 p-4 overflow-y-auto z-50">
          <h3 className="text-lg font-bold mb-2">{selectedZone.name} Analysis</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Crop Type:</span><span>{selectedZone.cropType}</span></div>
            <div className="flex justify-between"><span>NDVI:</span><span>{selectedZone.ndvi.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>NDWI:</span><span>{selectedZone.ndwi.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Temperature:</span><span>{selectedZone.temperature.toFixed(1)}°C</span></div>
            <div className="flex justify-between"><span>Soil Moisture:</span><span>{selectedZone.soilMoisture.toFixed(1)}%</span></div>
            <div className="flex justify-between"><span>Stress Level:</span><StressIndicator level={selectedZone.stressLevel} /></div>
            <div className="flex justify-between"><span>Irrigation Status:</span><span>{selectedZone.irrigationStatus}</span></div>
          </div>
          {editingZone && (
            <button
              onClick={saveZone}
              className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save Changes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
