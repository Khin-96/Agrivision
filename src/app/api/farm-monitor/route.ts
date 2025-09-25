// route.ts
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
const GMAP_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

// -------------------
// Helpers
// -------------------
const isSwahiliQuestion = (q: string) =>
  /^(naomba|tafadhali|habari|hali|mvua|udongo|mazao|shamba|kulima|jua|hewa|baridi|moto|majani|mimea|mbegu|mchanga|rutuba)/i.test(q) ||
  /\b(asante|sana|mambo|vipi|poa|safi|mzuri|baya|nzuri|kidogo|sana|hapana|ndiyo|jinsi gani|namna gani)\b/i.test(q);

// Reverse Geocode
async function reverseGeocode(lat: number, lng: number) {
  if (!GMAP_KEY) return { fullAddress: "Unknown location", landmark: "Unknown area", street: "Unknown road" };
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GMAP_KEY}&language=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Geocoding failed");

    const payload = await res.json();
    const first = payload.results?.[0];
    if (!first) throw new Error("No results");

    const comps = first.address_components || [];
    const find = (type: string) => comps.find(c => Array.isArray(c.types) && c.types.includes(type))?.long_name;

    const street = find("route") || find("street_address") || "Nearby road";
    const locality = find("locality") || find("sublocality") || find("postal_town");
    const admin = find("administrative_area_level_1") || find("administrative_area_level_2");
    const country = find("country");

    let landmark = locality || admin || street || "the area";

    const fullAddress = first.formatted_address || `${street}, ${locality}, ${country}`;
    return { fullAddress, landmark, street };
  } catch {
    return { fullAddress: `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`, landmark: "this area", street: "the main road" };
  }
}

// Centroid
function centroid(coords: { lat: number; lng: number }[]) {
  const sum = coords.reduce((acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / coords.length, lng: sum.lng / coords.length };
}

// Field analysis
function analyzeField(field: any) {
  const { ndvi, soilMoisture, soilPh, temperature, weather, pollen, elevation } = field;

  const health = ndvi > 0.6 ? "healthy" : ndvi > 0.3 ? "stressed" : "critical";
  const waterAdvice = soilMoisture > 35 ? "No irrigation needed" : soilMoisture > 20 ? "Irrigate moderately" : "Irrigation required";
  const phAdvice = soilPh >= 6 && soilPh <= 7 ? "pH optimal" : soilPh < 6 ? "Consider lime application" : "Consider sulfur application";
  const yieldEstimate = health === "healthy" ? "High yield expected" : health === "stressed" ? "Moderate yield expected" : "Low yield expected";
  const sunAdvice = temperature > 30 ? "Provide shade or mulching" : "Sunlight adequate";
  const windAdvice = elevation > 300 ? "Wind may affect crops, secure light plants" : "Wind not critical";
  const pollenAdvice = pollen === "High" ? "Good for cross-pollination" : pollen === "Moderate" ? "Pollination moderate" : "Limited pollination potential";

  return { health, waterAdvice, phAdvice, yieldEstimate, sunAdvice, windAdvice, pollenAdvice, temperature, weather, soilMoisture, soilPh };
}

// Generate Field Data
function generateFieldData(field: any) {
  return {
    ndvi: 0.2 + Math.random() * 0.6,
    soilMoisture: 10 + Math.random() * 40,
    soilPh: 5.5 + Math.random() * 2,
    temperature: 20 + Math.random() * 15,
    weather: ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain"][Math.floor(Math.random() * 4)],
    pollen: ["Low", "Moderate", "High"][Math.floor(Math.random() * 3)],
    elevation: 100 + Math.random() * 500,
  };
}

// -------------------
// POST handler
// -------------------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { field, question = "", centroid: centroidOverride, action = "chat" } = body;

    if (action === "generateFieldData" && field?.coordinates?.length) {
      const fieldData = generateFieldData(field);
      const analyzed = analyzeField(fieldData);
      return NextResponse.json({ fieldData: { ...fieldData, ...analyzed } });
    }

    if (!field || !field.coordinates?.length)
      return NextResponse.json({ answer: "Please draw a field on the map first." });

    const center = centroidOverride || centroid(field.coordinates);
    const location = await reverseGeocode(center.lat, center.lng);
    const fieldData = generateFieldData(field);
    const analyzed = analyzeField(fieldData);

    const useSwahili = isSwahiliQuestion(question);

    const systemInstruction = useSwahili
      ? `Wewe ni msaidizi wa kilimo. Toa muhtasari wa shamba, hali ya mazao, na mapendekezo ya vitendo 3 vinavyofaa kwa wakulima.`
      : `You are a farm assistant. Provide a summary of the field, crop condition, and 3 actionable recommendations for the farmer.`;

    const userMessage = useSwahili
      ? `
Shamba lako liko karibu na ${location.landmark}, eneo la ${location.street}.
Hali ya shamba: Afya ya mazao: ${analyzed.health}, pH: ${analyzed.phAdvice}, Udongo: ${analyzed.soilMoisture}%
Joto: ${analyzed.temperature}°C, Hali ya hewa: ${analyzed.weather}, Mazao yanayotarajiwa: ${analyzed.yieldEstimate}
Mapendekezo: ${analyzed.waterAdvice}, ${analyzed.sunAdvice}, ${analyzed.windAdvice}, Uzalishaji wa mbegu/pollen: ${analyzed.pollenAdvice}

Swali la mkulima: ${question}
`
      : `
Your field is located near ${location.landmark}, along ${location.street}.
Field status: Crop health: ${analyzed.health}, Soil pH: ${analyzed.phAdvice}, Soil moisture: ${analyzed.soilMoisture}%
Temperature: ${analyzed.temperature}°C, Weather: ${analyzed.weather}, Expected yield: ${analyzed.yieldEstimate}
Recommendations: ${analyzed.waterAdvice}, ${analyzed.sunAdvice}, ${analyzed.windAdvice}, Pollen: ${analyzed.pollenAdvice}

Farmer's question: ${question}
`;

    const chat = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userMessage },
      ],
      temperature: 0.6,
    });

    const answer = chat.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ answer: answer || "No response generated." });
  } catch (err: any) {
    console.error("farm-monitor route error:", err);
    return NextResponse.json({ answer: "Server error: " + err.message }, { status: 500 });
  }
}
