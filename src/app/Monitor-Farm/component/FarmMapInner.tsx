"use client";

import { useState, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  DrawingManager,
  OverlayView,
} from "@react-google-maps/api";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Minus, Bot } from "lucide-react";

interface Field {
  id: string;
  name: string;
  coordinates: google.maps.LatLngLiteral[];
  area: number;
  health: "healthy" | "stressed" | "critical";
  soil: "dry" | "normal" | "wet";
  temperature: number;
  weather: string;
  pollen: string;
  airQuality: string;
  elevation: number;
  centroid?: { lat: number; lng: number };
  yieldEstimate?: string;
  waterAdvice?: string;
  sunAdvice?: string;
  windAdvice?: string;
  phAdvice?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SuggestionBubble {
  id: string;
  text: string;
  question: string;
}

export default function FarmMapInner() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["drawing", "geometry", "places"],
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const [mapCenter, setMapCenter] = useState({ lat: -1.286389, lng: 36.817223 });
  const [fields, setFields] = useState<Field[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredField, setHoveredField] = useState<Field | null>(null);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);

  // Suggestion bubbles
  const suggestionBubbles: SuggestionBubble[] = [
    { id: "1", text: "🌱 Need crop tips?", question: "How can I improve my crop health?" },
    { id: "2", text: "🌤️ Check weather?", question: "What's the weather forecast for my field?" },
    { id: "3", text: "💧 Water advice?", question: "How much should I water my crops?" },
    { id: "4", text: "🌿 Crop health?", question: "How are my crops doing?" },
    { id: "5", text: "📍 Field location?", question: "Where is this field located?" },
  ];

  // Auto-scroll chat
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Cycle bubbles when minimized
  useEffect(() => {
    if (chatMinimized) {
      const interval = setInterval(() => {
        setCurrentSuggestionIndex((prev) => (prev + 1) % suggestionBubbles.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [chatMinimized, suggestionBubbles.length]);

  // Mock data generator
  const generateFieldData = async (coordinates: google.maps.LatLngLiteral[]) => {
    try {
      const area = google.maps.geometry.spherical.computeArea(
        new google.maps.Polygon({ paths: coordinates }).getPath()
      );

      const res = await fetch("/api/farm-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: { coordinates, area }, action: "generateFieldData" }),
      });

      const data = await res.json();
      return data.fieldData || {
        health: "healthy",
        soil: "normal",
        temperature: 25,
        weather: "Sunny",
        pollen: "Moderate",
        airQuality: "Good",
        elevation: 0,
        yieldEstimate: "Estimated yield: 500kg",
        waterAdvice: "Irrigate moderately",
        sunAdvice: "Provide shade if too hot",
        windAdvice: "Install windbreaks if strong wind",
        phAdvice: "pH is acceptable",
      };
    } catch {
      return {
        health: "healthy",
        soil: "normal",
        temperature: 25,
        weather: "Sunny",
        pollen: "Moderate",
        airQuality: "Good",
        elevation: 0,
        yieldEstimate: "Estimated yield: 500kg",
        waterAdvice: "Irrigate moderately",
        sunAdvice: "Provide shade if too hot",
        windAdvice: "Install windbreaks if strong wind",
        phAdvice: "pH is acceptable",
      };
    }
  };

  const handlePolygonComplete = async (polygon: google.maps.Polygon) => {
    const path = polygon.getPath().getArray().map((p) => ({ lat: p.lat(), lng: p.lng() }));
    const area = google.maps.geometry.spherical.computeArea(polygon.getPath());
    const centroidLatLng = {
      lat: path.reduce((sum, p) => sum + p.lat, 0) / path.length,
      lng: path.reduce((sum, p) => sum + p.lng, 0) / path.length,
    };

    const extraData = await generateFieldData(path);
    const newField: Field = {
      id: Date.now().toString(),
      name: `Field ${fields.length + 1}`,
      coordinates: path,
      area,
      centroid: centroidLatLng,
      ...extraData,
    };

    setFields((prev) => [...prev, newField]);
    setSelectedField(newField);
    polygon.setMap(null);
  };

  const focusField = (field: Field) => {
    if (!mapRef.current || !field.centroid) return;
    mapRef.current.panTo(field.centroid);
    mapRef.current.setZoom(16);
    setMapCenter(field.centroid);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (fields.length === 0) return alert("Please draw a field first!");

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const fieldToUse = selectedField || fields[fields.length - 1];
      const centroid = fieldToUse.centroid || {
        lat: fieldToUse.coordinates.reduce((sum, p) => sum + p.lat, 0) / fieldToUse.coordinates.length,
        lng: fieldToUse.coordinates.reduce((sum, p) => sum + p.lng, 0) / fieldToUse.coordinates.length,
      };

      const res = await fetch("/api/farm-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: fieldToUse, question: input, centroid }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || "No response" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestion = (question: string) => {
    setInput(question);
    if (question.trim()) {
      setTimeout(() => sendMessage(), 100);
    }
  };

  if (!isLoaded)
    return (
      <div className="flex justify-center items-center h-screen text-lg text-gray-700">
        Loading map...
      </div>
    );

  return (
    <div className="relative w-full h-screen">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={mapCenter}
        zoom={12}
        onLoad={(map) => {
          mapRef.current = map;
        }}
      >
        <DrawingManager
          onPolygonComplete={handlePolygonComplete}
          options={{
            drawingControl: true,
            drawingControlOptions: {
              position: google.maps.ControlPosition.TOP_CENTER,
              drawingModes: [google.maps.drawing.OverlayType.POLYGON],
            },
            polygonOptions: {
              fillColor: "#4caf50",
              fillOpacity: 0.35,
              strokeWeight: 2,
              clickable: true,
              editable: false,
              zIndex: 1,
            },
          }}
        />

        {fields.map((f) => {
          const fillColor =
            f.health === "healthy"
              ? "#4caf50"
              : f.health === "stressed"
              ? "#ff9800"
              : "#f44336";

          return (
            <Polygon
              key={f.id}
              paths={f.coordinates}
              options={{
                fillColor,
                fillOpacity: 0.35,
                strokeColor: fillColor,
                strokeWeight: 2,
              }}
              onClick={() => {
                setSelectedField(f);
                focusField(f);
              }}
              onMouseOver={() => setHoveredField(f)}
              onMouseOut={() => setHoveredField(null)}
            />
          );
        })}
      </GoogleMap>

      {/* Floating AI Chat */}
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: chatMinimized ? 400 : 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="absolute right-0 top-0 bottom-0 w-96 z-50 flex flex-col bg-black/40 shadow-2xl border-l border-white/20"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-green-600/80 to-blue-600/80 text-white">
          <div className="flex items-center gap-2">
            <Bot size={20} />
            <span className="font-semibold">Vision AI</span>
          </div>
          <button
            onClick={() => setChatMinimized(true)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <Minus size={16} />
          </button>
        </div>

        {/* Messages */}
        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-300 mt-8">
              <MessageCircle size={48} className="mx-auto mb-3 text-gray-400/70" />
              <p className="text-sm">Ask me about your farm, crops, or weather!</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    m.role === "user"
                      ? "bg-blue-600/80 text-white rounded-br-none"
                      : "bg-gray-800/70 text-gray-200 rounded-bl-none"
                  }`}
                >
                  <div className="text-sm">{m.content}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/20 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your farm..."
            className="flex-1 border border-white/30 bg-black/40 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm placeholder-gray-400"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="bg-blue-600/80 text-white px-4 py-2 rounded-lg hover:bg-blue-700/80 disabled:opacity-50 transition-colors backdrop-blur-sm"
          >
            Send
          </button>
        </div>
      </motion.div>
    </div>
  );
}
