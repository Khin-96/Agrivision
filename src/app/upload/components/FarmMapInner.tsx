// app/upload/components/FarmMapInner.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Popup,
  Marker,
  FeatureGroup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { EditControl } from "react-leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

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

const MapPanTo = ({ coords }: { coords: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(coords, 16, { duration: 1.5 });
  }, [coords, map]);
  return null;
};

export default function FarmMapInner({
  layer,
  showAnalysis = false,
  onLocationChange,
  center = [-1.286389, 36.817223],
}: FarmMapInnerProps) {
  const [zones, setZones] = useState<FarmZone[]>([]);
  const [tileUrl, setTileUrl] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<FarmZone | null>(null);
  const [clickedLocation, setClickedLocation] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [panCoords, setPanCoords] = useState<[number, number] | null>(null);
  const [drawingZones, setDrawingZones] = useState<FarmZone[]>([]);
  const [editingZone, setEditingZone] = useState<FarmZone | null>(null);

  const featureGroupRef = useRef<L.FeatureGroup>(null);

  const stressColors = {
    low: "#2ecc71",
    medium: "#f1c40f",
    high: "#e74c3c",
  };

  // Fetch zones from API
  useEffect(() => {
    if (typeof window === "undefined") return;

    async function fetchFarmData() {
      try {
        const res = await fetch(
          `/api/farm-monitor?lat=${center[0]}&lng=${center[1]}&type=${layer}`
        );
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
  }, [layer, center]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      const results = await res.json();
      if (results.length > 0) {
        const { lat, lon } = results[0];
        const coords: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setClickedLocation(coords);
        setPanCoords(coords);
        onLocationChange?.(coords);
        setSelectedZone(null);
      } else {
        alert("Location not found");
      }
    } catch (err) {
      console.error("Search error:", err);
      alert("Search failed");
    }
  };

  // Handle new polygon creation
  const handleCreated = (e: any) => {
    const layer = e.layer;
    if (layer instanceof L.Polygon) {
      const latlngs = layer.getLatLngs()[0].map((p: any) => [p.lat, p.lng]) as [number, number][];
      const newZone: FarmZone = {
        id: `drawn-${Date.now()}`,
        name: "New Farm Zone",
        coordinates: latlngs,
        ndvi: Math.random() * 0.8 + 0.1,
        ndwi: Math.random() * 0.8 + 0.1,
        temperature: 25,
        soilMoisture: 50,
        stressLevel: "low",
        irrigationStatus: "adequate",
        cropType: "Unknown",
      };
      setDrawingZones((prev) => [...prev, newZone]);
      setEditingZone(newZone); // open edit form
      setSelectedZone(newZone);
    }
  };

  // Handle polygon deletion
  const handleDeleted = (e: any) => {
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      setDrawingZones((prev) =>
        prev.filter(
          (zone) =>
            !zone.coordinates.some((coord) =>
              layer.getLatLngs()[0].some((p: any) => p.lat === coord[0] && p.lng === coord[1])
            )
        )
      );
      setSelectedZone(null);
      setEditingZone(null);
    });
  };

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {/* Map */}
      <div style={{ flex: 3, position: "relative" }}>
        {/* Search bar (top-left) */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 1000,
            background: "white",
            padding: "0.5rem",
            borderRadius: 4,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          <input
            type="text"
            placeholder="Search farm/location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginRight: 4, padding: "0.25rem" }}
          />
          <button onClick={handleSearch} style={{ padding: "0.25rem 0.5rem" }}>
            Go
          </button>
        </div>

        {/* Map */}
        <MapContainer
          center={center}
          zoom={16}
          style={{ height: "600px", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer url={tileUrl || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />

          {panCoords && <MapPanTo coords={panCoords} />}

          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              position="topright"
              onCreated={handleCreated}
              onDeleted={handleDeleted}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: true,
              }}
            />

            {/* Render all zones */}
            {[...zones, ...drawingZones].map((zone) => (
              <Polygon
                key={zone.id}
                pathOptions={{ color: stressColors[zone.stressLevel], weight: 2 }}
                positions={zone.coordinates.map(([lat, lng]) => [lat, lng])}
                eventHandlers={{
                  click: () => {
                    setSelectedZone(zone);
                    setEditingZone(zone);
                    setClickedLocation(null);
                  },
                }}
              >
                <Popup>
                  <div>
                    <strong>{zone.name}</strong>
                    <p>Crop: {zone.cropType}</p>
                    <p>NDVI: {zone.ndvi.toFixed(2)}</p>
                    <p>NDWI: {zone.ndwi.toFixed(2)}</p>
                    <p>Temperature: {zone.temperature.toFixed(1)}°C</p>
                    <p>Soil Moisture: {zone.soilMoisture.toFixed(1)}%</p>
                    <p>Irrigation: {zone.irrigationStatus}</p>
                    <p>Stress Level: {zone.stressLevel}</p>
                  </div>
                </Popup>
              </Polygon>
            ))}

            {clickedLocation && <Marker position={clickedLocation} />}
          </FeatureGroup>
        </MapContainer>

        {/* Edit form for new/selected zone */}
        {editingZone && (
          <div
            style={{
              position: "absolute",
              top: 60,
              left: 10,
              zIndex: 1100,
              background: "white",
              padding: "1rem",
              borderRadius: 6,
              boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <h4>Edit Farm Zone</h4>
            <input
              type="text"
              placeholder="Farm Name"
              value={editingZone.name}
              onChange={(e) =>
                setEditingZone({ ...editingZone, name: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Crop Type"
              value={editingZone.cropType}
              onChange={(e) =>
                setEditingZone({ ...editingZone, cropType: e.target.value })
              }
            />
            <select
              value={editingZone.stressLevel}
              onChange={(e) =>
                setEditingZone({
                  ...editingZone,
                  stressLevel: e.target.value as "low" | "medium" | "high",
                })
              }
            >
              <option value="low">Low Stress</option>
              <option value="medium">Medium Stress</option>
              <option value="high">High Stress</option>
            </select>
            <select
              value={editingZone.irrigationStatus}
              onChange={(e) =>
                setEditingZone({
                  ...editingZone,
                  irrigationStatus: e.target.value as
                    | "adequate"
                    | "insufficient"
                    | "excessive",
                })
              }
            >
              <option value="adequate">Adequate</option>
              <option value="insufficient">Insufficient</option>
              <option value="excessive">Excessive</option>
            </select>
            <button
              onClick={() => {
                setDrawingZones((prev) =>
                  prev.map((z) => (z.id === editingZone.id ? editingZone : z))
                );
                setEditingZone(null);
              }}
            >
              Save
            </button>
            <button
              onClick={() => setEditingZone(null)}
              style={{ marginTop: 4 }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Q&A Panel */}
      <div
        style={{
          flex: 1,
          maxWidth: 300,
          padding: "1rem",
          background: "#f9f9f9",
          borderRadius: 8,
        }}
      >
        <h3>Farm Analysis</h3>
        {selectedZone ? (
          <div>
            <strong>{selectedZone.name}</strong>
            <p><strong>Crop:</strong> {selectedZone.cropType}</p>
            <p><strong>NDVI:</strong> {selectedZone.ndvi.toFixed(2)}</p>
            <p><strong>NDWI:</strong> {selectedZone.ndwi.toFixed(2)}</p>
            <p><strong>Temperature:</strong> {selectedZone.temperature.toFixed(1)}°C</p>
            <p><strong>Soil Moisture:</strong> {selectedZone.soilMoisture.toFixed(1)}%</p>
            <p><strong>Irrigation:</strong> {selectedZone.irrigationStatus}</p>
            <p><strong>Stress Level:</strong> {selectedZone.stressLevel}</p>

            <h4>Advice</h4>
            <ul>
              <li>
                {selectedZone.irrigationStatus === "insufficient"
                  ? "Irrigation needed soon."
                  : selectedZone.irrigationStatus === "excessive"
                  ? "Reduce watering to avoid waterlogging."
                  : "Irrigation is adequate."}
              </li>
              <li>
                {selectedZone.stressLevel === "high"
                  ? "Crop is under high stress. Check for pests, disease, or water stress."
                  : selectedZone.stressLevel === "medium"
                  ? "Moderate stress detected. Monitor regularly."
                  : "Crop is healthy."}
              </li>
              <li>
                {selectedZone.ndvi < 0.3
                  ? "Vegetation is sparse. Consider fertilization or irrigation."
                  : "Vegetation looks good."}
              </li>
            </ul>
          </div>
        ) : clickedLocation ? (
          <div>
            <p>Selected Location:</p>
            <p>Lat: {clickedLocation[0].toFixed(5)}, Lng: {clickedLocation[1].toFixed(5)}</p>
            <p>Click on a farm zone to see detailed analysis.</p>
          </div>
        ) : (
          <p>Click on a farm zone or search for a location to start.</p>
        )}
      </div>
    </div>
  );
}
