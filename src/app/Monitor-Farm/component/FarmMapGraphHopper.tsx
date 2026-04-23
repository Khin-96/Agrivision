"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    MessageCircle,
    Minus,
    Bot,
    Navigation,
    Route as RouteIcon,
    X,
    Loader2,
    Layers,
    Share2,
    Volume2,
    VolumeX,
    Download,
    Clock,
    Plus,
    Search,
    MapPin,
} from "lucide-react";
import {
    getRoute,
    reverseGeocode,
    formatDistance,
    formatTime,
    getIsochrone,
    getAlternativeRoutes,
    getSuggestions,
    type Coordinate,
    type Route,
    type GeocodingResult
} from "@/lib/services/graphhopper";

// Dynamically import Leaflet components
const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const Polygon = dynamic(
    () => import("react-leaflet").then((mod) => mod.Polygon),
    { ssr: false }
);
const Polyline = dynamic(
    () => import("react-leaflet").then((mod) => mod.Polyline),
    { ssr: false }
);
const Marker = dynamic(
    () => import("react-leaflet").then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import("react-leaflet").then((mod) => mod.Popup),
    { ssr: false }
);
const FeatureGroup = dynamic(
    () => import("react-leaflet").then((mod) => mod.FeatureGroup),
    { ssr: false }
);
const EditControl = dynamic(
    () => import("react-leaflet-draw").then((mod) => mod.EditControl),
    { ssr: false }
);

interface Field {
    id: string;
    name: string;
    coordinates: Coordinate[];
    area: number;
    health: "healthy" | "stressed" | "critical";
    soil: "dry" | "normal" | "wet";
    temperature: number;
    weather: string;
    pollen: string;
    airQuality: string;
    elevation: number;
    centroid?: Coordinate;
    yieldEstimate?: string;
    waterAdvice?: string;
    sunAdvice?: string;
    windAdvice?: string;
    phAdvice?: string;
    address?: string;
}

interface Message {
    role: "user" | "assistant";
    content: string;
}

type MapLayer = "street" | "satellite" | "terrain";
type VehicleType = "car" | "bike" | "foot";

export default function FarmMapEnhanced() {
    const mapRef = useRef<any>(null);
    const chatRef = useRef<HTMLDivElement | null>(null);
    const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

    const [mapCenter, setMapCenter] = useState<Coordinate>({ lat: -1.286389, lng: 36.817223 });
    const [fields, setFields] = useState<Field[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [selectedField, setSelectedField] = useState<Field | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [chatMinimized, setChatMinimized] = useState(false);
    const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
    const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
    const [alternativeRoutes, setAlternativeRoutes] = useState<Route[]>([]);
    const [showRoutePanel, setShowRoutePanel] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

    // New features state
    const [mapLayer, setMapLayer] = useState<MapLayer>("street");
    const [vehicleType, setVehicleType] = useState<VehicleType>("car");
    const [showLayerMenu, setShowLayerMenu] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [isochroneData, setIsochroneData] = useState<any>(null);
    const [showIsochrone, setShowIsochrone] = useState(false);
    const [isochroneTime, setIsochroneTime] = useState(1800); // 30 minutes
    const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Map tile URLs
    const tileUrls = {
        street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        terrain: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
    };

    // Suggestion bubbles (Emojis removed)
    const suggestionBubbles = [
        { id: "1", text: "Need crop tips?", question: "How can I improve my crop health?" },
        { id: "2", text: "Check weather?", question: "What's the weather forecast for my field?" },
        { id: "3", text: "Water advice?", question: "How much should I water my crops?" },
        { id: "4", text: "Field location?", question: "Where is this field located?" },
    ];

    // Fix Leaflet icons and Move Controls
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import("leaflet").then((L) => {
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                });
            });
        }
    }, []);

    // Close search suggestions on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const searchContainer = document.getElementById('search-container');
            if (searchContainer && !searchContainer.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-scroll chat
    useEffect(() => {
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    // Voice navigation
    useEffect(() => {
        if (voiceEnabled && currentRoute && currentRoute.instructions.length > 0) {
            speakInstruction(currentRoute.instructions[currentInstructionIndex]);
        }
    }, [voiceEnabled, currentInstructionIndex, currentRoute]);

    const speakInstruction = (instruction: any) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(instruction.text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;
            window.speechSynthesis.speak(utterance);
            speechSynthesisRef.current = utterance;
        }
    };

    const toggleVoice = () => {
        setVoiceEnabled(!voiceEnabled);
        if (voiceEnabled) {
            window.speechSynthesis?.cancel();
        }
    };

    // Get user location
    const getUserLocation = () => {
        setIsGettingLocation(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setUserLocation(location);
                    setIsGettingLocation(false);

                    if (mapRef.current) {
                        mapRef.current.flyTo([location.lat, location.lng], 13);
                    }
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setIsGettingLocation(false);
                    alert("Unable to get your location. Please enable location services.");
                }
            );
        } else {
            setIsGettingLocation(false);
            alert("Geolocation is not supported by your browser.");
        }
    };

    const handleCreated = async (e: any) => {
        const { layerType, layer } = e;
        if (layerType === 'polygon') {
            const coords = layer.getLatLngs()[0].map((ll: any) => ({
                lat: ll.lat,
                lng: ll.lng
            }));

            setIsLoading(true);
            const fieldData = await generateFieldAnalysis(coords);
            const newField: Field = {
                id: Math.random().toString(36).substr(2, 9),
                name: `Field ${fields.length + 1}`,
                coordinates: coords,
                centroid: calculateCentroid(coords),
                ...fieldData
            };

            setFields(prev => [...prev, newField]);
            setSelectedField(newField);
            setIsLoading(false);

            // Add AI message about new field
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `I've analyzed your new field. It has an area of ${(newField.area / 10000).toFixed(2)} hectares. The health status is ${newField.health} and soil moisture is ${newField.soil}. How can I help you with this specific area?`
            }]);
        }
    };

    const generateFieldAnalysis = async (coordinates: Coordinate[]) => {
        try {
            const area = calculatePolygonArea(coordinates);
            const centroid = calculateCentroid(coordinates);

            const res = await fetch("/api/farm-monitor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    field: { coordinates, area },
                    action: "generateFieldData",
                    centroid
                }),
            });

            const data = await res.json();
            return {
                area,
                health: data.fieldData?.health || "healthy",
                soil: data.fieldData?.soil || "normal",
                temperature: data.fieldData?.temperature || 25,
                weather: data.fieldData?.weather || "Sunny",
                pollen: data.fieldData?.pollen || "Moderate",
                elevation: data.fieldData?.elevation || 0,
                airQuality: data.fieldData?.airQuality || "Good",
                yieldEstimate: data.fieldData?.yieldEstimate,
                waterAdvice: data.fieldData?.waterAdvice,
                address: data.fieldData?.address || `${centroid.lat.toFixed(4)}, ${centroid.lng.toFixed(4)}`
            };
        } catch {
            return {
                area: calculatePolygonArea(coordinates),
                health: "healthy" as const,
                soil: "normal" as const,
                temperature: 25,
                weather: "Sunny",
                pollen: "Moderate",
                elevation: 0,
                airQuality: "Good",
                address: "New Field Location"
            };
        }
    };

    const calculatePolygonArea = (coordinates: Coordinate[]): number => {
        let area = 0;
        for (let i = 0; i < coordinates.length; i++) {
            const j = (i + 1) % coordinates.length;
            area += coordinates[i].lng * coordinates[j].lat;
            area -= coordinates[j].lng * coordinates[i].lat;
        }
        return Math.abs(area / 2) * 111319 * 111132; // m2 approx
    };

    const calculateCentroid = (coordinates: Coordinate[]): Coordinate => {
        const sum = coordinates.reduce(
            (acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }),
            { lat: 0, lng: 0 }
        );
        return { lat: sum.lat / coordinates.length, lng: sum.lng / coordinates.length };
    };

    const calculateRoute = async (field: Field, showAlternatives = false) => {
        if (!userLocation) {
            getUserLocation();
            return;
        }

        if (!field.centroid) return;

        setIsCalculatingRoute(true);
        try {
            if (showAlternatives) {
                const routes = await getAlternativeRoutes(userLocation, field.centroid, vehicleType, 3);
                if (routes && routes.length > 0) {
                    setCurrentRoute(routes[0]);
                    setAlternativeRoutes(routes.slice(1));
                    setShowRoutePanel(true);

                    setMessages((prev) => [...prev, {
                        role: "assistant",
                        content: `I found ${routes.length} routes. The fastest is ${formatDistance(routes[0].distance)} taking ${formatTime(routes[0].time)}.`
                    }]);
                }
            } else {
                const route = await getRoute(userLocation, field.centroid, vehicleType);
                if (route) {
                    setCurrentRoute(route);
                    setShowRoutePanel(true);
                }
            }
        } catch (error) {
            console.error("Error calculating route:", error);
        } finally {
            setIsCalculatingRoute(false);
        }
    };

    const calculateIsochrone = async () => {
        if (!userLocation) {
            getUserLocation();
            return;
        }

        try {
            const data = await getIsochrone({
                point: userLocation,
                time_limit: isochroneTime,
                buckets: 3,
                reverse_flow: false
            });

            if (data) {
                setIsochroneData(data);
                setShowIsochrone(true);
            }
        } catch (error) {
            console.error("Error calculating isochrone:", error);
            alert("Unable to fetch reachable area data.");
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        const currentInput = input;
        setInput("");
        setIsLoading(true);

        try {
            const fieldToUse = selectedField || (fields.length > 0 ? fields[fields.length - 1] : null);
            const centroid = fieldToUse?.centroid || (userLocation ? userLocation : null);

            const res = await fetch("/api/farm-monitor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    field: fieldToUse,
                    question: currentInput,
                    centroid,
                    userLocation
                }),
            });

            const data = await res.json();
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.answer || "No response received." },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Error communicating with the assistant." },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);
            const results = await getSuggestions(query);
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
            setIsSearching(false);
        }, 500);
    };

    const selectSuggestion = (result: GeocodingResult) => {
        setMapCenter({ lat: result.lat, lng: result.lng });
        if (mapRef.current) {
            mapRef.current.flyTo([result.lat, result.lng], 15);
        }
        setSearchQuery(result.name);
        setShowSuggestions(false);
    };

    return (
        <div className="relative w-full h-screen">
            {/* Search Bar */}
            <div id="search-container" className="absolute top-4 left-14 z-[1000] w-80">
                <div className="relative group">
                    <div className="flex items-center bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 focus-within:ring-2 focus-within:ring-green-600 focus-within:border-transparent">
                        <div className="pl-4 text-gray-400">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search locations..."
                            className="w-full px-3 py-3 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400 font-medium"
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        />
                        {isSearching && (
                            <div className="pr-4">
                                <Loader2 className="animate-spin text-green-600" size={16} />
                            </div>
                        )}
                        {searchQuery && !isSearching && (
                            <button 
                                onClick={() => { setSearchQuery(""); setSuggestions([]); setShowSuggestions(false); }}
                                className="pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <AnimatePresence>
                        {showSuggestions && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden max-h-80 overflow-y-auto z-[1001]"
                            >
                                {suggestions.map((result, index) => (
                                    <button
                                        key={index}
                                        onClick={() => selectSuggestion(result)}
                                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left border-b border-gray-50 last:border-0"
                                    >
                                        <div className="mt-1 text-green-600">
                                            <MapPin size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-800 line-clamp-1">{result.name}</div>
                                            <div className="text-xs text-gray-500 line-clamp-1">
                                                {[result.city, result.state, result.country].filter(Boolean).join(", ")}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={12}
                style={{ width: "100%", height: "100%" }}
                ref={mapRef}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url={tileUrls[mapLayer]}
                />

                <FeatureGroup>
                    <EditControl
                        position="topright"
                        onCreated={handleCreated}
                        draw={{
                            rectangle: false,
                            circle: false,
                            circlemarker: false,
                            marker: false,
                            polyline: false,
                            polygon: {
                                allowIntersection: false,
                                drawError: {
                                    color: '#e1e1e1',
                                    message: 'Cannot intersect lines'
                                },
                            }
                        }}
                    />
                </FeatureGroup>

                {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]}>
                        <Popup>Your Location</Popup>
                    </Marker>
                )}

                {showIsochrone && isochroneData?.polygons?.map((polygon: any, index: number) => {
                    const coords = polygon.geometry.coordinates[0].map(
                        (coord: number[]) => [coord[1], coord[0]] as [number, number]
                    );
                    return (
                        <Polygon
                            key={index}
                            positions={coords}
                            pathOptions={{
                                color: "#2563eb",
                                fillColor: "#2563eb",
                                fillOpacity: 0.1,
                                weight: 1
                            }}
                        />
                    );
                })}

                {fields.map((field) => {
                    const color = field.health === "healthy" ? "#4caf50" : field.health === "stressed" ? "#ff9800" : "#f44336";
                    return (
                        <Polygon
                            key={field.id}
                            positions={field.coordinates.map(c => [c.lat, c.lng])}
                            pathOptions={{ color, fillColor: color, fillOpacity: 0.3, weight: 2 }}
                            eventHandlers={{ click: () => setSelectedField(field) }}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-bold">{field.name}</h3>
                                    <p className="text-sm">Health: {field.health}</p>
                                    <p className="text-sm">Soil: {field.soil}</p>
                                    <button
                                        onClick={() => calculateRoute(field, true)}
                                        className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm w-full"
                                    >
                                        Get Directions
                                    </button>
                                </div>
                            </Popup>
                        </Polygon>
                    );
                })}

                {currentRoute && (
                    <Polyline
                        positions={currentRoute.points.map(p => [p.lat, p.lng])}
                        pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.8 }}
                    />
                )}
            </MapContainer>

            {/* Custom Controls (Emoji-free & Repositioned) */}
            <div className="absolute bottom-8 left-4 z-[1000] flex flex-col gap-2">
                <button
                    onClick={getUserLocation}
                    className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
                >
                    {isGettingLocation ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
                </button>

                <div 
                    className="relative"
                    onMouseEnter={() => setShowLayerMenu(true)}
                    onMouseLeave={() => setShowLayerMenu(false)}
                >
                    <button 
                        onClick={() => setShowLayerMenu(!showLayerMenu)}
                        className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
                    >
                        <Layers size={20} />
                    </button>
                    
                    <AnimatePresence>
                        {showLayerMenu && (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="absolute left-full ml-2 bottom-0 bg-white rounded-xl shadow-2xl p-2 w-32 border border-gray-100 z-[1001]"
                            >
                                {/* Invisible bridge to prevent mouseleave when moving to the menu */}
                                <div className="absolute top-0 -left-2 w-2 h-full cursor-default" />
                                
                                <div className="flex flex-col gap-1">
                                    {Object.keys(tileUrls).map(layer => (
                                        <button
                                            key={layer}
                                            onClick={() => {
                                                setMapLayer(layer as MapLayer);
                                                setShowLayerMenu(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                                                mapLayer === layer 
                                                ? 'bg-green-600 text-white' 
                                                : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                                            }`}
                                        >
                                            {layer}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    onClick={calculateIsochrone}
                    className="bg-white p-3 rounded-lg shadow-lg"
                >
                    <Clock size={20} />
                </button>
            </div>

            {/* Chat Panel (Synced with Vision.tsx) */}
            <div className="absolute right-6 bottom-24 z-[1000]">
                <AnimatePresence mode="wait">
                    {!chatMinimized ? (
                        <motion.div
                            key="chat-panel"
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="w-96 h-[600px] flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xl pointer-events-auto shadow-black/20"
                        >
                            {/* Header */}
                            <div className="bg-green-800 text-white px-4 py-3 flex justify-between items-center border-b border-green-700">
                                <div className="flex items-center space-x-2">
                                    <Bot size={20} />
                                    <span className="font-semibold text-sm">Vision AI Assistant</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setChatMinimized(true)}
                                        className="p-1 hover:bg-green-700/50 rounded-md transition-colors"
                                    >
                                        <Minus size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <div className="mb-4 w-20 h-20 relative ring-4 ring-green-800/20 rounded-full">
                                            <Image
                                                src="/avatar.png"
                                                alt="Vision AI"
                                                fill
                                                className="rounded-full object-cover"
                                            />
                                        </div>
                                        <p className="font-medium text-green-900/80">Hello! I'm ready to help you.</p>
                                        <p className="text-xs text-green-800/60 mt-1">Ask me about your farm analysis.</p>
                                    </div>
                                ) : (
                                    messages.map((m, i) => (
                                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 shadow-sm ${m.role === 'user'
                                                    ? 'bg-green-800 text-white rounded-l-2xl rounded-tr-2xl rounded-br-none'
                                                    : 'bg-green-50 text-green-900 border border-green-200 rounded-r-2xl rounded-tl-2xl rounded-bl-none'
                                                }`}>
                                                <p className="text-sm">{m.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-green-50 p-2 rounded-r-xl rounded-tl-xl border border-green-200">
                                            <Loader2 size={16} className="animate-spin text-green-800" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input Support Suggestions */}
                            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {suggestionBubbles.map((b) => (
                                        <button
                                            key={b.id}
                                            onClick={() => setInput(b.question)}
                                            className="px-3 py-1 bg-white text-green-800 text-[10px] rounded-full hover:bg-green-50 border border-green-100 transition-colors shadow-sm"
                                        >
                                            {b.text}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex space-x-2">
                                    <textarea
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                                        placeholder="Type your question..."
                                        className="flex-1 bg-white/80 border border-green-200/50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-800/30 text-sm placeholder-green-400 text-green-900 h-11 resize-none overflow-y-auto rounded-xl shadow-inner shadow-black/5"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!input.trim() || isLoading}
                                        className="bg-green-800 opacity-90 text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed h-11 w-11 rounded-xl shadow-lg active:scale-95 transition-all"
                                    >
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.button
                            key="avatar-trigger"
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 20 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setChatMinimized(false)}
                            className="relative w-16 h-16 rounded-full bg-green-800 shadow-2xl flex items-center justify-center overflow-hidden border-2 border-white pointer-events-auto"
                        >
                            <Image
                                src="/avatar.png"
                                alt="Avatar"
                                fill
                                className="object-cover"
                            />
                            {messages.length > 0 && (
                                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
