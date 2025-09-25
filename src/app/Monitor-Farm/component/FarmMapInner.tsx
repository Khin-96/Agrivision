"use client";

import { useState, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  DrawingManager,
  OverlayView,
  Autocomplete,
} from "@react-google-maps/api";
import { motion, AnimatePresence } from "framer-motion";

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
  const [chatVisible, setChatVisible] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-hide chat after 10s when minimized
  useEffect(() => {
    if (chatMinimized) {
      const timer = setTimeout(() => setChatVisible(false), 10000);
      return () => clearTimeout(timer);
    } else {
      setChatVisible(true);
    }
  }, [chatMinimized]);

  // Initialize Autocomplete Service
  useEffect(() => {
    if (!serviceRef.current && isLoaded) {
      serviceRef.current = new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (!searchInput || !serviceRef.current) {
      setAutocompleteSuggestions([]);
      return;
    }

    serviceRef.current.getPlacePredictions(
      { input: searchInput, componentRestrictions: { country: "ke" } },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setAutocompleteSuggestions(predictions);
        } else {
          setAutocompleteSuggestions([]);
        }
      }
    );
  }, [searchInput]);

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
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || "No response" }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestion = (question: string) => setInput(question);

  const handleSuggestionClick = (suggestion: google.maps.places.AutocompletePrediction) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId: suggestion.place_id }, (results, status) => {
      if (status === "OK" && results && results[0].geometry?.location) {
        const loc = results[0].geometry.location;
        const position = { lat: loc.lat(), lng: loc.lng() };
        setMapCenter(position);
        mapRef.current?.panTo(position);
        mapRef.current?.setZoom(16);
        setSearchInput(suggestion.description);
        setAutocompleteSuggestions([]);
      }
    });
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
        onLoad={(map) => (mapRef.current = map)}
        onDragEnd={() => {
          if (mapRef.current) {
            const center = mapRef.current.getCenter();
            if (center) setMapCenter({ lat: center.lat(), lng: center.lng() });
          }
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
            f.health === "healthy" ? "#4caf50" : f.health === "stressed" ? "#ff9800" : "#f44336";
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

        {/* Hover Popup */}
        <AnimatePresence>
          {hoveredField?.centroid && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <OverlayView position={hoveredField.centroid} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div className="bg-white/80 text-black p-3 rounded-lg shadow-lg text-xs max-w-xs backdrop-blur-sm">
                  <div className="font-bold text-sm mb-1">{hoveredField.name}</div>
                  <div>Health: {hoveredField.health}</div>
                  <div>Soil: {hoveredField.soil}</div>
                  <div>Temp: {hoveredField.temperature}°C</div>
                  <div>Weather: {hoveredField.weather}</div>
                  <div>Pollen: {hoveredField.pollen}</div>
                  <div>Yield Est.: {hoveredField.yieldEstimate}</div>
                  <div>Water Advice: {hoveredField.waterAdvice}</div>
                  <div>Sun Advice: {hoveredField.sunAdvice}</div>
                  <div>Wind Advice: {hoveredField.windAdvice}</div>
                  <div>pH Advice: {hoveredField.phAdvice}</div>
                </div>
              </OverlayView>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-96">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search places..."
            className="w-full px-4 py-2 rounded-lg shadow-lg text-black"
          />
          {searchInput && autocompleteSuggestions.length > 0 && (
            <div className="bg-white rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg z-50">
              {autocompleteSuggestions.map((s, i) => (
                <div
                  key={i}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200 transition-all"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s.description}
                </div>
              ))}
            </div>
          )}
        </div>
      </GoogleMap>

      {/* Draggable Fields Panel */}
      <AnimatePresence>
        {fields.length > 0 && (
          <motion.div
            drag
            dragConstraints={{ top: 0, left: 0, right: 1000, bottom: 1000 }}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-20 left-4 bg-white/20 backdrop-blur-md p-4 rounded-xl max-w-xs z-40 shadow-lg cursor-grab transition-all duration-300"
          >
            <h3 className="font-bold mb-2 text-white text-lg">Your Fields</h3>
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className={`p-3 rounded-lg cursor-pointer border-2 transition-all duration-200 hover:scale-105 ${
                    selectedField?.id === field.id
                      ? "border-blue-400 bg-blue-50/50"
                      : field.health === "critical"
                      ? "border-red-500 bg-red-50/50"
                      : field.health === "stressed"
                      ? "border-orange-500 bg-orange-50/50"
                      : "border-green-500 bg-green-50/50"
                  }`}
                  onClick={() => {
                    setSelectedField(field);
                    focusField(field);
                  }}
                >
                  <div className="font-semibold text-white">{field.name}</div>
                  <div className="text-xs text-white">
                    {(field.area / 10000).toFixed(2)} ha • {field.temperature}°C
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {chatVisible && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={`absolute top-0 bottom-0 right-4 w-96 flex flex-col z-50 shadow-lg transition-all duration-300 ${
              chatMinimized ? "h-12" : "h-full"
            }`}
          >
            {/* Header */}
            <div
              className="flex justify-between items-center px-3 py-2 bg-black/70 text-white rounded-t-xl cursor-pointer"
              onClick={() => setChatMinimized(!chatMinimized)}
            >
              <span>💬 Farm AI</span>
              <button className="text-sm">{chatMinimized ? "⬆️" : "⬇️"}</button>
            </div>

            {/* Floating Icon when minimized */}
            {chatMinimized && (
              <div
                className="absolute -left-12 top-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-lg"
                onClick={() => setChatMinimized(false)}
              >
                💬
              </div>
            )}

            {!chatMinimized && (
              <>
                {/* Messages */}
                <div
                  ref={chatRef}
                  className="flex-1 overflow-y-auto px-4 py-3 bg-black/40 text-white"
                >
                  {messages.length === 0 ? (
                    <p className="text-gray-200 text-sm">Ask about your farm... 🌱</p>
                  ) : (
                    messages.map((m, i) => (
                      <div
                        key={i}
                        className={`mb-2 max-w-[85%] px-3 py-2 rounded-lg transition-all duration-200 ${
                          m.role === "assistant"
                            ? "bg-green-600 text-white ml-auto"
                            : "bg-black text-white mr-auto"
                        }`}
                      >
                        <b>{m.role === "user" ? "👤 You: " : "🤖 Bot: "}</b>
                        {m.content}
                      </div>
                    ))
                  )}
                  {isLoading && <div className="text-gray-200">Thinking...</div>}
                </div>

                {/* Quick questions */}
                <div className="flex flex-wrap gap-2 px-3 py-2 bg-black/50">
                  {[
                    { label: "📍 Location", question: "Where is this field located?" },
                    { label: "🌱 Crop Health", question: "How are my crops doing?" },
                    { label: "🌤️ Weather", question: "Hali ya hewa leo?" },
                    { label: "🌿 Mazao", question: "Mazao yangu yakoje?" },
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => quickQuestion(q.question)}
                      className="text-xs bg-white/20 text-white px-3 py-1 rounded-lg hover:bg-white/30 transition-all duration-150"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="flex gap-2 px-3 py-2 bg-white/90 rounded-b-xl">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 rounded px-3 py-2 text-black"
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
