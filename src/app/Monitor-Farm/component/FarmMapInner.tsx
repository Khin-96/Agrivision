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
import { MessageCircle, Minus, X, Bot } from "lucide-react";

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

  const [searchInput, setSearchInput] = useState("");
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  // Suggestion bubbles that cycle through
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

  // Cycle through suggestion bubbles when minimized
  useEffect(() => {
    if (chatMinimized) {
      const interval = setInterval(() => {
        setCurrentSuggestionIndex((prev) => (prev + 1) % suggestionBubbles.length);
      }, 4000); // Change every 4 seconds

      return () => clearInterval(interval);
    }
  }, [chatMinimized, suggestionBubbles.length]);

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

  const quickQuestion = (question: string) => {
    setInput(question);
    // Auto-send if there's a question
    if (question.trim()) {
      setTimeout(() => {
        sendMessage();
      }, 100);
    }
  };

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
        onLoad={(map) => { mapRef.current = map; }}
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

        {/* Search Bar - Back to bottom with improved styling */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-96">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search places..."
            className="w-full px-4 py-3 rounded-lg shadow-lg text-black bg-white/90 backdrop-blur-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchInput && autocompleteSuggestions.length > 0 && (
            <div className="bg-white/95 backdrop-blur-sm rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg z-50 border border-gray-200">
              {autocompleteSuggestions.map((s, i) => (
                <div
                  key={i}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-all border-b border-gray-100 last:border-b-0 text-black"
                  onClick={() => handleSuggestionClick(s)}
                >
                  <div className="font-medium text-sm">{s.structured_formatting.main_text}</div>
                  <div className="text-xs text-gray-600">{s.structured_formatting.secondary_text}</div>
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

      {/* Floating Avatar when minimized - Now draggable */}
      <AnimatePresence>
        {chatMinimized && (
          <motion.div
            drag
            dragConstraints={{ 
              top: 0, 
              left: 0, 
              right: typeof window !== 'undefined' ? window.innerWidth - 100 : 1000, 
              bottom: typeof window !== 'undefined' ? window.innerHeight - 100 : 1000 
            }}
            dragElastic={0.1}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-50 cursor-grab active:cursor-grabbing"
          >
            {/* Suggestion Bubble */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSuggestionIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-16 right-0 bg-white/95 backdrop-blur-sm text-black px-4 py-2 rounded-lg shadow-lg max-w-xs mb-2 border border-gray-200"
              >
                <div className="text-sm font-medium">
                  {suggestionBubbles[currentSuggestionIndex].text}
                </div>
                <div className="w-3 h-3 bg-white/95 absolute -bottom-1 right-4 rotate-45 border-b border-r border-gray-200"></div>
              </motion.div>
            </AnimatePresence>

            {/* Avatar Image */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setChatMinimized(false)}
              className="bg-transparent p-0 rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <img 
                src="/avatar.png" 
                alt="Farm AI Assistant"
                className="w-14 h-14 rounded-full object-cover border-2 border-white/80 shadow-lg"
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Docked Chat Panel - Updated to fit within map boundaries */}
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: chatMinimized ? 400 : 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="absolute right-0 top-0 bottom-0 w-96 z-50 flex flex-col bg-black/40 shadow-2xl border-l border-white/20"
        style={{ height: '100%' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-green-600/80 to-blue-600/80 text-white">
          <div className="flex items-center gap-2">
            <Bot size={20} />
            <span className="font-semibold">Farm AI Assistant</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setChatMinimized(true)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Minimize"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {messages.length === 0 ? (
            <div className="text-center text-gray-300 mt-8">
              <MessageCircle size={48} className="mx-auto mb-3 text-gray-400/70" />
              <p className="text-sm">Ask me about your farm, crops, or weather!</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    m.role === "user"
                      ? "bg-blue-600/80 text-white rounded-br-none backdrop-blur-sm"
                      : "bg-gray-800/70 text-gray-200 rounded-bl-none backdrop-blur-sm"
                  }`}
                >
                  <div className="text-sm">{m.content}</div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800/70 text-gray-200 px-3 py-2 rounded-lg rounded-bl-none backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Questions */}
        <div className="px-4 py-3 border-t border-white/20">
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { label: "🌱 Crop Health", question: "How are my crops doing?" },
              { label: "🌤️ Weather", question: "What's the weather forecast?" },
              { label: "💧 Water Advice", question: "How much should I water my crops?" },
              { label: "📍 Location", question: "Where is this field located?" },
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => quickQuestion(q.question)}
                className="text-xs bg-gray-800/50 hover:bg-gray-700/70 text-gray-200 px-3 py-2 rounded-full transition-all duration-150 backdrop-blur-sm"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
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
        </div>
      </motion.div>
    </div>
  );
}