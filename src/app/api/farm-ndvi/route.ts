/*import { NextRequest, NextResponse } from "next/server";
import ee from "@google/earthengine";
import fs from "fs";
import path from "path";

// Path to your service-account.json
const SERVICE_ACCOUNT_PATH = path.resolve("./service-account.json");

// Keep track of initialization to avoid multiple EE inits
let eeInitialized = false;

async function initializeEE() {
  if (eeInitialized) return;

  // Load service account key
  const key = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));

  await new Promise<void>((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      key,
      () => {
        ee.initialize(
          null,
          null,
          () => {
            eeInitialized = true;
            console.log("Earth Engine initialized successfully!");
            resolve();
          },
          (err) => reject(err)
        );
      },
      (err) => reject(err)
    );
  });
}

export async function GET(req: NextRequest) {
  try {
    await initializeEE();

    // Parse lat/lng from query parameters
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");

    const point = ee.Geometry.Point([lng, lat]);

    // Query latest Landsat 8 image dynamically
    const image = ee.ImageCollection("LANDSAT/LC08/C02/T1_TOA")
      .filterBounds(point)
      .filterDate("2022-01-01", new Date().toISOString())
      .sort("CLOUD_COVER")
      .first();

    const ndvi = image.normalizedDifference(["B5", "B4"]);

    const meanNdvi = await ndvi
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: point,
        scale: 30,
      })
      .getInfo();

    if (!meanNdvi) {
      return NextResponse.json(
        { error: "No NDVI data found for this location" },
        { status: 404 }
      );
    }

    // Return NDVI + Google Maps API key
    return NextResponse.json(
      {
        ndvi: meanNdvi,
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GEE API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch NDVI", details: err.message },
      { status: 500 }
    );
  }
}
