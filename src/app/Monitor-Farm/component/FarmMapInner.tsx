"use client";

import { useState, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  DrawingManager,
} from "@react-google-maps/api";

interface Field {
  id: string;
  name: string;
  coordinates: google.maps.LatLngLiteral[];
  area: number;
  ndvi: number;
  ndwi: number;
  soilMoisture: number;
  soilPh: number;
  temperature: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function FarmMapInner() {
  // ✅ Single consistent loader config (always include "places")
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["drawing", "geometry", "places"],
  });

  const [fields, setFields] = useState<Field[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);

  const generateIoTData = () => ({
    ndvi: +(Math.random() * (0.9 - 0.2) + 0.2).toFixed(2),
    ndwi: +(Math.random() * (0.8 - 0.1) + 0.1).toFixed(2),
    soilMoisture: +(Math.random() * (40 - 10) + 10).toFixed(1),
    soilPh: +(Math.random() * (7.5 - 5.5) + 5.5).toFixed(1),
    temperature: +(Math.random() * (35 - 15) + 15).toFixed(1),
  });

  const handlePolygonComplete = (polygon: google.maps.Polygon) => {
    const path = polygon
      .getPath()
      .getArray()
      .map((p) => ({ lat: p.lat(), lng: p.lng() }));
    const area = google.maps.geometry.spherical.computeArea(polygon.getPath());

    const newField: Field = {
      id: Date.now().toString(),
      name: `Field ${fields.length + 1}`,
      coordinates: path,
      area,
      ...generateIoTData(),
    };

    setFields([newField]); // keep last drawn field
    polygon.setMap(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || fields.length === 0) return;

    const visionMode = input.includes("@vision");

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch("/api/farm-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: fields[0],
          question: input,
          visionMode,
        }),
      });

      const data = await res.json();
      const botMessage: Message = {
        role: "assistant",
        content: data.answer || "No response",
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Chat error:", err);
    }
  };

  const handleSearch = () => {
    if (!mapRef.current || !searchQuery.trim()) return;
    const service = new google.maps.places.PlacesService(mapRef.current);

    service.findPlaceFromQuery(
      { query: searchQuery, fields: ["geometry", "name"] },
      (results, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results[0].geometry?.location
        ) {
          const loc = results[0].geometry.location;
          mapRef.current?.panTo(loc);
          mapRef.current?.setZoom(15);
        }
      }
    );
  };

  const locateMe = () => {
    if (navigator.geolocation && mapRef.current) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapRef.current?.panTo(loc);
        mapRef.current?.setZoom(16);
      });
    }
  };

  if (!isLoaded) return <p>Loading map...</p>;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2 p-2 bg-gray-200 rounded">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a place..."
          className="flex-1 border rounded p-2 bg-white text-black"
        />
        <button
          onClick={handleSearch}
          className="bg-green-600 text-white px-4 rounded"
        >
          Search
        </button>
        <button
          onClick={locateMe}
          className="bg-blue-600 text-white px-4 rounded"
        >
          My Location
        </button>
      </div>

      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "60vh" }}
        center={{ lat: -1.286389, lng: 36.817223 }}
        zoom={8}
        onLoad={(map) => { mapRef.current = map; }}
      >
        <DrawingManager
          onPolygonComplete={handlePolygonComplete}
          options={{ 
            drawingControlOptions: { 
              drawingModes: [google.maps.drawing.OverlayType.POLYGON] 
            } 
          }}
        />
        {fields.map((f) => (
          <Polygon
            key={f.id}
            paths={f.coordinates}
            options={{ fillColor: "green", strokeColor: "darkgreen" }}
          />
        ))}
      </GoogleMap>

      {/* Chat UI */}
      <div className="p-4 bg-gray-100 rounded-lg">
        <h2 className="font-bold mb-2">Ask About Your Farm</h2>
        <div className="h-48 overflow-y-auto bg-white p-2 rounded border mb-2 text-black">
          {messages.map((m, i) => (
            <p
              key={i}
              className={m.role === "user" ? "text-blue-600" : "text-green-700"}
            >
              <b>{m.role === "user" ? "Farmer:" : "Assistant:"}</b> {m.content}
            </p>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question (use @vision for crop check)..."
            className="flex-1 border rounded p-2 bg-white text-black"
          />
          <button
            onClick={sendMessage}
            className="bg-green-600 text-white px-4 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}