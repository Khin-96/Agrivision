import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
const GMAP_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

const isLocationQuestion = (q: string) =>
  /\b(where|location|located|what city|what town|which town|nearest)\b/i.test(q);

async function reverseGeocode(lat: number, lng: number) {
  if (!GMAP_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GMAP_KEY}&language=en`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const payload = await res.json();
  const first = payload.results?.[0];
  if (!first) return null;

  const comps = first.address_components || [];
  const find = (type: string) =>
    comps.find((c: any) => Array.isArray(c.types) && c.types.includes(type))?.long_name;

  const locality = find("locality") || find("sublocality") || find("postal_town");
  const admin = find("administrative_area_level_1") || find("administrative_area_level_2");
  const country = find("country");

  if (locality && country) return `${locality}, ${country}`;
  if (locality) return locality;
  if (admin && country) return `${admin}, ${country}`;
  return first.formatted_address?.split(",").slice(0, 3).join(", ") || null;
}

function centroid(coords: { lat: number; lng: number }[]) {
  const sum = coords.reduce(
    (acc, c) => ({ lat: acc.lat + Number(c.lat), lng: acc.lng + Number(c.lng) }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / coords.length, lng: sum.lng / coords.length };
}

function summarizeField(field: any) {
  let health =
    field.ndvi > 0.6
      ? "very healthy crops"
      : field.ndvi > 0.3
      ? "moderately healthy crops"
      : "stressed or weak crops";

  let water =
    field.soilMoisture > 35
      ? "soil has plenty of moisture"
      : field.soilMoisture > 20
      ? "soil moisture is moderate"
      : "soil is quite dry";

  let ph =
    field.soilPh >= 6 && field.soilPh <= 7
      ? "soil pH is good for most crops"
      : `soil pH is ${field.soilPh}, which may need adjustment`;

  return `Crop health: ${health}. ${water}. ${ph}. Temperature is around ${field.temperature}°C.`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { field, question = "", centroid: centroidOverride } = body;

    if (!field || !field.coordinates?.length) {
      return NextResponse.json({ answer: "Please draw a field on the map first." });
    }

    const center = centroidOverride || centroid(field.coordinates);

    if (isLocationQuestion(question)) {
      const place = await reverseGeocode(center.lat, center.lng);
      return NextResponse.json({ answer: place || `Lat ${center.lat}, Lng ${center.lng}` });
    }

    const placeName = await reverseGeocode(center.lat, center.lng);
    const fieldSummary = summarizeField(field);

    const systemInstruction = `
You are Vision, a helpful farm assistant.
- Answer short and clear for factual questions.
- For broader farming questions: 1-line summary, short explanation, 3 farmer-friendly actions.
- Avoid technical terms like NDVI; describe crop health, soil moisture, or plant needs.
`;

    const userMessage = `
Farm context:
- Location: ${placeName || "Unknown"}
- Area: ${(field.area / 10000).toFixed(2)} hectares
- Field conditions: ${fieldSummary}

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
    return NextResponse.json({ answer: answer || "I couldn't generate an answer." });
  } catch (err: any) {
    console.error("farm-monitor route error:", err);
    return NextResponse.json({ answer: "Server error: " + err.message }, { status: 500 });
  }
}
