// app/api/farm-monitor/route.ts
import { NextResponse } from "next/server";
import path from "path";
import { GoogleAuth } from "google-auth-library";

// -------------------
// Helpers
// -------------------

interface Coordinate { lat: number; lng: number; }

interface FieldData {
  ndvi: number;
  soilMoisture: number;
  soilPh: number;
  temperature: number;
  weather: string;
  pollen: string;
  elevation: number;
}

interface AnalysisResult {
  health: string;
  waterAdvice: string;
  phAdvice: string;
  yieldEstimate: string;
  sunAdvice: string;
  windAdvice: string;
  pollenAdvice: string;
  temperature: number;
  weather: string;
  soilMoisture: number;
  soilPh: number;
}

const GMAP_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const POLLEN_KEY = process.env.NEXT_PUBLIC_POLLEN_API_KEY || "";

// -------------------
// Language Detection
// -------------------
const isSwahiliQuestion = (q: string) =>
  /^(naomba|tafadhali|habari|hali|mvua|udongo|mazao|shamba|kulima|jua|hewa|baridi|moto|majani|mimea|mbegu|mchanga|rutuba)/i.test(q) ||
  /\b(asante|sana|mambo|vipi|poa|safi|mzuri|baya|nzuri|kidogo|sana|hapana|ndiyo|jinsi gani|namna gani)\b/i.test(q);

// -------------------
// Utilities
// -------------------
function centroid(coords: Coordinate[]): Coordinate {
  const sum = coords.reduce((acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / coords.length, lng: sum.lng / coords.length };
}

// -------------------
// Google Auth
// -------------------
async function getGoogleClient() {
  const keyFile = path.join(process.cwd(), "service-account.json");
  const auth = new GoogleAuth({
    keyFilename: keyFile,
    scopes: ["https://www.googleapis.com/auth/earthengine"],
  });
  return await auth.getClient();
}

// -------------------
// Google Maps APIs
// -------------------
async function reverseGeocode(lat: number, lng: number) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GMAP_KEY}&language=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Geocoding failed");
    const payload = await res.json();
    const first = payload.results?.[0];
    if (!first) return { fullAddress: "Unknown location", landmark: "Unknown area", street: "Unknown road" };
    const comps = first.address_components || [];
    const find = (type: string) => comps.find(c => c.types?.includes(type))?.long_name;
    const street = find("route") || find("street_address") || "Nearby road";
    const locality = find("locality") || find("sublocality") || find("postal_town");
    const admin = find("administrative_area_level_1") || find("administrative_area_level_2");
    const country = find("country");
    return { fullAddress: first.formatted_address, landmark: locality || admin || street, street };
  } catch {
    return { fullAddress: `Lat ${lat}, Lng ${lng}`, landmark: "this area", street: "the main road" };
  }
}

async function getElevation(lat: number, lng: number): Promise<number> {
  try {
    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${GMAP_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results?.[0]?.elevation || 100;
  } catch {
    return 100;
  }
}

// -------------------
// Pollen API (Google / fallback)
// -------------------
async function getPollen(lat: number, lng: number): Promise<string> {
  if (!POLLEN_KEY) return "Moderate"; // fallback
  try {
    const url = `https://pollen.googleapis.com/v1/forecast:lookup?location.latitude=${lat}&location.longitude=${lng}&key=${POLLEN_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Pollen API failed");
    const data = await res.json();
    const idx = data.plantInfo?.indexInfo?.indexValue || 5;
    if (idx > 7) return "High";
    if (idx > 4) return "Moderate";
    return "Low";
  } catch {
    return "Moderate";
  }
}

// -------------------
// Earth Engine REST API
// -------------------
function coordinatesToEePolygon(coords: Coordinate[]) {
  const poly = coords.map(c => [c.lng, c.lat]);
  if (poly.length > 0 && (poly[0][0] !== poly[poly.length-1][0] || poly[0][1] !== poly[poly.length-1][1])) {
    poly.push(poly[0]);
  }
  return { type: "Polygon", coordinates: [poly] };
}

async function getNdvi(client: any, coords: Coordinate[]): Promise<number> {
  try {
    const body = {
      mapId: "COPERNICUS/S2_SR_HARMONIZED",
      // You can customize Earth Engine request
      // For demonstration, you may need to build proper EE script here
    };
    // Example placeholder: in production, you'd POST a request to EE v1 REST endpoint with proper JSON
    // For now, return a random realistic NDVI
    return 0.3 + Math.random() * 0.5;
  } catch {
    return 0.4;
  }
}

async function getSoilMoisture(client: any, coords: Coordinate[]): Promise<number> {
  return 20 + Math.random() * 30; // Placeholder
}

async function getSoilPh(client: any, coords: Coordinate[]): Promise<number> {
  return 5.5 + Math.random() * 2; // Placeholder
}

// -------------------
// Analysis
// -------------------
function analyzeField(field: FieldData): AnalysisResult {
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

// -------------------
// Generate real field data
// -------------------
async function generateRealFieldData(field: { coordinates: Coordinate[] }): Promise<FieldData & AnalysisResult> {
  const client = await getGoogleClient();
  const center = centroid(field.coordinates);

  const [ndvi, soilMoisture, soilPh, elevation, pollen] = await Promise.all([
    getNdvi(client, field.coordinates),
    getSoilMoisture(client, field.coordinates),
    getSoilPh(client, field.coordinates),
    getElevation(center.lat, center.lng),
    getPollen(center.lat, center.lng)
  ]);

  const temperature = 20 + Math.random() * 10; // Replace with real weather API call
  const weather = "Sunny"; // Replace with real weather API call

  const fieldData: FieldData = { ndvi, soilMoisture, soilPh, temperature, weather, pollen, elevation };
  const analyzed = analyzeField(fieldData);
  return { ...fieldData, ...analyzed };
}

// -------------------
// API Route
// -------------------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { field, question = "", centroid: centroidOverride, action = "chat" } = body;

    if (!field || !field.coordinates?.length) {
      return NextResponse.json({ answer: "Please draw a field on the map first." });
    }

    const center = centroidOverride || centroid(field.coordinates);
    const [location, fieldData] = await Promise.all([
      reverseGeocode(center.lat, center.lng),
      generateRealFieldData(field)
    ]);

    const useSwahili = isSwahiliQuestion(question);

    const systemInstruction = useSwahili
      ? `Wewe ni msaidizi wa kilimo. Toa muhtasari wa shamba, hali ya mazao, na mapendekezo ya vitendo 3 vinavyofaa kwa wakulima.`
      : `You are a farm assistant. Provide a summary of the field, crop condition, and 3 actionable recommendations for the farmer.`;

    const userMessage = useSwahili
      ? `
Shamba lako liko karibu na ${location.landmark}, eneo la ${location.street}.
Hali ya shamba: Afya ya mazao: ${fieldData.health}, pH: ${fieldData.phAdvice}, Udongo: ${fieldData.soilMoisture}%
Joto: ${fieldData.temperature}°C, Hali ya hewa: ${fieldData.weather}, Mazao yanayotarajiwa: ${fieldData.yieldEstimate}
Mapendekezo: ${fieldData.waterAdvice}, ${fieldData.sunAdvice}, ${fieldData.windAdvice}, Uzalishaji wa mbegu/pollen: ${fieldData.pollenAdvice}

Swali la mkulima: ${question}
`
      : `
Your field is located near ${location.landmark}, along ${location.street}.
Field status: Crop health: ${fieldData.health}, Soil pH: ${fieldData.phAdvice}, Soil moisture: ${fieldData.soilMoisture}%
Temperature: ${fieldData.temperature}°C, Weather: ${fieldData.weather}, Expected yield: ${fieldData.yieldEstimate}
Recommendations: ${fieldData.waterAdvice}, ${fieldData.sunAdvice}, ${fieldData.windAdvice}, Pollen: ${fieldData.pollenAdvice}

Farmer's question: ${question}
`;

    // Send to Groq AI
    // const chat = await groq.chat.completions.create({
    //   model: "llama-3.1-8b-instant",
    //   messages: [
    //     { role: "system", content: systemInstruction },
    //     { role: "user", content: userMessage },
    //   ],
    //   temperature: 0.6,
    // });

    // const answer = chat.choices?.[0]?.message?.content?.trim() || "No response generated.";
    const answer = userMessage; // Temporary fallback for testing

    return NextResponse.json({ answer, fieldData });
  } catch (err: any) {
    console.error("farm-monitor route error:", err);
    return NextResponse.json({ answer: "Server error: " + err.message }, { status: 500 });
  }
}
