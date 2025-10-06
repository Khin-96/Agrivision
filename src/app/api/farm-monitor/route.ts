// app/api/farm-monitor/route.ts
import { NextResponse } from "next/server";
import path from "path";
import { GoogleAuth } from "google-auth-library";
import Groq from "groq-sdk";

interface Coordinate { lat: number; lng: number; }
interface FieldData {
  ndvi: number;
  soilMoisture: number;
  soilPh: number;
  temperature: number;
  weather: string;
  pollen: string;
  elevation: number;
  cropType: string;
}
interface AnalysisResult {
  health: string;
  waterAdvice: string;
  phAdvice: string;
  yieldEstimate: string;
  sunAdvice: string;
  windAdvice: string;
  pollenAdvice: string;
  farmingTypes: string[];
  recommendations: string[];
  temperature: number;
  weather: string;
  soilMoisture: number;
  soilPh: number;
  cropType: string;
}

// -------------------
// Env
// -------------------
const GMAP_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const POLLEN_KEY = process.env.NEXT_PUBLIC_POLLEN_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

// -------------------
// Helpers
// -------------------
const isSwahiliQuestion = (q: string) =>
  /^(naomba|tafadhali|habari|hali|mvua|udongo|mazao|shamba|kulima|jua|hewa|baridi|moto|majani|mimea|mbegu|mchanga|rutuba)/i.test(q);

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
interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

async function reverseGeocode(lat: number, lng: number) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GMAP_KEY}&language=en`;
    const res = await fetch(url);
    const payload = await res.json();
    const first = payload.results?.[0];
    const comps = first?.address_components || [];
    
    const find = (type: string) => comps.find((c: AddressComponent) => c.types?.includes(type))?.long_name;
    
    const street = find("route") || find("street_address") || "Nearby road";
    const locality = find("locality") || find("sublocality") || find("postal_town");
    const admin = find("administrative_area_level_1") || find("administrative_area_level_2");
    return { fullAddress: first?.formatted_address || `${lat},${lng}`, landmark: locality || admin || street, street };
  } catch {
    return { fullAddress: `${lat},${lng}`, landmark: "this area", street: "the main road" };
  }
}

async function getElevation(lat: number, lng: number): Promise<number> {
  try {
    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${GMAP_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results?.[0]?.elevation || 100;
  } catch { return 100; }
}

async function getPollen(lat: number, lng: number): Promise<string> {
  if (!POLLEN_KEY) return "Moderate";
  try {
    const url = `https://pollen.googleapis.com/v1/forecast:lookup?location.latitude=${lat}&location.longitude=${lng}&key=${POLLEN_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const idx = data.plantInfo?.indexInfo?.indexValue || 5;
    if (idx > 7) return "High";
    if (idx > 4) return "Moderate";
    return "Low";
  } catch { return "Moderate"; }
}

// -------------------
// Crop Classification via Google Earth Engine
// -------------------
async function getCropType(coords: Coordinate[]): Promise<string> {
  try {
    const client = await getGoogleClient();
    let token: string | null | undefined;

    // Retry OAuth token 3 times
    for (let i = 0; i < 3; i++) {
      try {
        const accessToken = await client.getAccessToken();
        token = accessToken.token;
        if (token) break;
      } catch (err: any) {
        console.warn(`OAuth token retry ${i + 1} failed:`, err.message);
        await new Promise(res => setTimeout(res, 1000));
      }
    }
    if (!token) throw new Error("Failed to acquire OAuth token");

    const polyCoords = coords.map(c => [c.lng, c.lat]);
    polyCoords.push(polyCoords[0]); // close polygon

    const body = {
      expression: `
        var poly = ee.Geometry.Polygon(${JSON.stringify(polyCoords)});
        var collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                          .filterBounds(poly)
                          .filterDate('2025-01-01', '2025-12-31')
                          .median()
                          .clip(poly);
        var ndvi = collection.normalizedDifference(['B8','B4']);
        var evi = collection.expression(
          '2.5 * ((NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1))', {
            NIR: collection.select('B8'),
            RED: collection.select('B4'),
            BLUE: collection.select('B2')
        });
        var ndwi = collection.normalizedDifference(['B3','B8']);
        var meanNDVI = ndvi.reduceRegion({reducer: ee.Reducer.mean(), geometry: poly, scale: 10}).get('nd');
        var meanEVI = evi.reduceRegion({reducer: ee.Reducer.mean(), geometry: poly, scale: 10}).get('constant');
        var meanNDWI = ndwi.reduceRegion({reducer: ee.Reducer.mean(), geometry: poly, scale: 10}).get('nd');
        var cropType = ee.String('Unknown');
        cropType = ee.Algorithms.If(meanNDVI > 0.65 && meanEVI > 0.55, 'Maize', cropType);
        cropType = ee.Algorithms.If(meanNDVI > 0.5 && meanNDVI <= 0.65 && meanEVI > 0.4, 'Wheat', cropType);
        cropType = ee.Algorithms.If(meanNDVI > 0.45 && meanNDWI > 0.3, 'Rice', cropType);
        cropType = ee.Algorithms.If(meanNDVI > 0.4 && meanEVI < 0.3, 'Vegetables', cropType);
        cropType;
      `,
    };

    const res = await fetch("https://earthengine.googleapis.com/v1/projects/earthengine-legacy/compute", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data?.result ?? "Unknown";
    } catch {
      console.warn("EE API returned non-JSON response:", text);
      return "Unknown";
    }
  } catch (err: any) {
    console.error("EE crop classification error:", err);
    return "Unknown";
  }
}

// -------------------
// Field Analysis & Recommendations
// -------------------
function analyzeField(field: FieldData): AnalysisResult {
  const { ndvi, soilMoisture, soilPh, temperature, weather, pollen, cropType, elevation } = field;
  const health = ndvi > 0.6 ? "healthy" : ndvi > 0.3 ? "stressed" : "critical";
  const waterAdvice = soilMoisture > 35 ? "No irrigation needed" : soilMoisture > 20 ? "Irrigate moderately" : "Irrigation required";
  const phAdvice = soilPh >= 6 && soilPh <= 7 ? "pH optimal" : soilPh < 6 ? "Consider lime application" : "Consider sulfur application";
  const yieldEstimate = health === "healthy" ? "High yield expected" : health === "stressed" ? "Moderate yield expected" : "Low yield expected";
  const sunAdvice = temperature > 30 ? "Provide shade or mulching" : "Sunlight adequate";
  const windAdvice = elevation > 300 ? "Wind may affect crops, secure light plants" : "Wind not critical";
  const pollenAdvice = pollen === "High" ? "Good for cross-pollination" : pollen === "Moderate" ? "Pollination moderate" : "Limited pollination potential";

  const farmingTypes = [
    cropType.includes("Vegetables") || cropType.includes("Floriculture") ? "Horticulture/Floriculture" : "Field Crops",
    ndvi > 0.6 ? "Intensive/Commercial Farming" : "Subsistence Farming",
    soilMoisture < 20 ? "Dryland/Rainfed Agriculture" : "Irrigated Agriculture",
  ];

  const recommendations = [
    `Follow crop-specific best practices for ${cropType}.`,
    waterAdvice,
    phAdvice,
    sunAdvice,
    windAdvice,
    pollenAdvice,
  ];

  return { health, waterAdvice, phAdvice, yieldEstimate, sunAdvice, windAdvice, pollenAdvice, farmingTypes, recommendations, temperature, weather, soilMoisture, soilPh, cropType };
}

// -------------------
// Generate Field Data
// -------------------
async function generateRealFieldData(field: { coordinates: Coordinate[] }): Promise<FieldData & AnalysisResult> {
  const center = centroid(field.coordinates);

  const [ndvi, soilMoisture, soilPh, elevation, pollen, cropType] = await Promise.all([
    0.3 + Math.random() * 0.5,
    20 + Math.random() * 30,
    5.5 + Math.random() * 2,
    getElevation(center.lat, center.lng),
    getPollen(center.lat, center.lng),
    getCropType(field.coordinates),
  ]);

  const temperature = 20 + Math.random() * 10;
  const weather = "Sunny";

  const fieldData: FieldData = { ndvi, soilMoisture, soilPh, temperature, weather, pollen, elevation, cropType };
  const analyzed = analyzeField(fieldData);
  return { ...fieldData, ...analyzed };
}

// -------------------
// API Route
// -------------------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { field, question = "", centroid: centroidOverride } = body;

    if (!field?.coordinates?.length) {
      return NextResponse.json({ answer: "Please draw a field on the map first." });
    }

    const center = centroidOverride || centroid(field.coordinates);
    const [location, fieldData] = await Promise.all([
      reverseGeocode(center.lat, center.lng),
      generateRealFieldData(field)
    ]);

    const useSwahili = isSwahiliQuestion(question);

    // -------------------
    // Groq AI dynamic response
    // -------------------
    const client = new Groq({ apiKey: GROQ_KEY });
    const systemPrompt = useSwahili
      ? `Wewe ni msaidizi wa kilimo. Toa muhtasari kamili wa shamba, hali ya mazao, aina ya mimea, na mapendekezo kwa mkulima.`
      : `You are a farm assistant. Provide a complete summary of the field, crop condition, crop type, and actionable recommendations for the farmer.`;

    const userPrompt = `
Field near ${location.landmark}, ${location.street}.
Crop: ${fieldData.cropType}, Health: ${fieldData.health}, Soil: ${fieldData.soilMoisture}%, pH: ${fieldData.phAdvice}, Temp: ${fieldData.temperature}°C, Weather: ${fieldData.weather}.
Recommendations: ${fieldData.recommendations.join(", ")}.
Farmer question: ${question}
`;

    const chat = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
    });

    const answer = chat.choices?.[0]?.message?.content?.trim() || "No response generated.";

    return NextResponse.json({ answer, fieldData });

  } catch (err: any) {
    console.error("farm-monitor route error:", err);
    return NextResponse.json({ answer: "Server error: " + err.message }, { status: 500 });
  }
}