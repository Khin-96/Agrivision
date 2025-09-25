"use client";

import { useState, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  DrawingManager,
  DirectionsRenderer,
} from "@react-google-maps/api";

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

  const [fields, setFields] = useState<Field[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // -------------------
  // Field Data Generation (via /api/farm-monitor)
  // -------------------
  const generateFieldData = async (
    coordinates: google.maps.LatLngLiteral[]
  ): Promise<Omit<Field, "id" | "name" | "coordinates" | "area">> => {
    try {
      const res = await fetch("/api/farm-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: { coordinates }, question: "status" }),
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
      };
    } catch (err) {
      console.error("Failed to fetch field data:", err);
      return {
        health: "healthy",
        soil: "normal",
        temperature: 25,
        weather: "Sunny",
        pollen: "Moderate",
        airQuality: "Good",
        elevation: 0,
      };
    }
  };

  // -------------------
  // Handlers
  // -------------------
  const handlePolygonComplete = async (polygon: google.maps.Polygon) => {
    const path = polygon.getPath().getArray().map((p) => ({ lat: p.lat(), lng: p.lng() }));
    const area = google.maps.geometry.spherical.computeArea(polygon.getPath());

    const extraData = await generateFieldData(path);

    const newField: Field = {
      id: Date.now().toString(),
      name: `Field ${fields.length + 1}`,
      coordinates: path,
      area,
      ...extraData,
    };

    setFields((prev) => [...prev, newField]);
    polygon.setMap(null);

    // Pan and zoom to polygon centroid
    const centroidLatLng = {
      lat: path.reduce((sum, p) => sum + p.lat, 0) / path.length,
      lng: path.reduce((sum, p) => sum + p.lng, 0) / path.length,
    };
    mapRef.current?.panTo(centroidLatLng);
    mapRef.current?.setZoom(16);
  };

  const sendMessage = async () => {
    if (!input.trim() || fields.length === 0) {
      if (fields.length === 0) alert("Draw a field first!");
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch("/api/farm-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: fields[fields.length - 1], question: input }),
      });

      const data = await res.json();
      const botMessage: Message = {
        role: "assistant",
        content: data.answer || "No response",
      };
      setMessages((prev) => [...prev, botMessage]);

      // Update last field if fieldData returned
      if (data.fieldData) {
        setFields((prev) =>
          prev.map((f, idx) =>
            idx === prev.length - 1 ? { ...f, ...data.fieldData } : f
          )
        );
      }
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
        } else {
          alert("Place not found");
        }
      }
    );
  };

  const locateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapRef.current?.panTo(loc);
        mapRef.current?.setZoom(16);
      },
      (err) => {
        alert("Unable to detect location");
        console.error(err);
      },
      { enableHighAccuracy: true }
    );
  };

  const navigateToField = (field: Field) => {
    if (!navigator.geolocation || !mapRef.current) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const destination = {
          lat: field.coordinates.reduce((sum, p) => sum + p.lat, 0) / field.coordinates.length,
          lng: field.coordinates.reduce((sum, p) => sum + p.lng, 0) / field.coordinates.length,
        };

        const directionsService = new google.maps.DirectionsService();

        directionsService.route(
          {
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === "OK" && result) {
              setDirections(result);
              mapRef.current?.panTo(destination);
            } else {
              alert("Unable to generate route");
            }
          }
        );
      },
      (err) => {
        alert("Unable to detect your location");
        console.error(err);
      },
      { enableHighAccuracy: true }
    );
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
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch} className="bg-green-600 text-white px-4 rounded">
          Search
        </button>
        <button onClick={locateMe} className="bg-blue-600 text-white px-4 rounded">
          My Location
        </button>
      </div>

      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "60vh" }}
        center={{ lat: -1.286389, lng: 36.817223 }}
        zoom={8}
        onLoad={(map) => (mapRef.current = map)}
      >
        <DrawingManager
          onPolygonComplete={handlePolygonComplete}
          options={{
            drawingControlOptions: {
              drawingModes: [google.maps.drawing.OverlayType.POLYGON],
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
                fillOpacity: 0.5,
                strokeColor: fillColor,
                strokeWeight: 2,
              }}
              onClick={() => {
                alert(
                  `${f.name}\nStatus: ${f.health}\nSoil: ${f.soil}\nTemp: ${f.temperature}°C\nWeather: ${f.weather}\nPollen: ${f.pollen}\nAir: ${f.airQuality}\nElevation: ${f.elevation}m`
                );
                navigateToField(f);
              }}
            />
          );
        })}

        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>

      {/* Chat UI */}
      <div className="p-4 bg-gray-100 rounded-lg">
        <h2 className="font-bold mb-2">Ask About Your Farm</h2>
        <div
          ref={chatRef}
          className="h-48 overflow-y-auto bg-white p-2 rounded border mb-2 text-black"
        >
          {messages.map((m, i) => (
            <p key={i} className={m.role === "user" ? "text-blue-600" : "text-green-700"}>
              <b>{m.role === "user" ? "Farmer:" : "Assistant:"}</b> {m.content}
            </p>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 border rounded p-2 bg-white text-black"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} className="bg-green-600 text-white px-4 rounded">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
