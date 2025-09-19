//src/app/api/farm-monitor/route.ts

import { NextRequest, NextResponse } from "next/server";
import ee from "@google/earthengine";
import fs from "fs";
import path from "path";

const SERVICE_ACCOUNT = path.join(process.cwd(), "service-account.json");

async function initEE() {
  const privateKey = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT, "utf-8"));
  await new Promise<void>((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(privateKey, () => {
      ee.initialize(null, null, resolve, reject);
    });
  });
}

function getEEImage(type: "ndvi" | "ndwi" | "temperature" | "rgb") {
  switch (type) {
    case "ndvi":
      return ee
        .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .select(["B4", "B8"])
        .median()
        .normalizedDifference(["B8", "B4"])
        .rename("NDVI");
    case "ndwi":
      return ee
        .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .select(["B3", "B8"])
        .median()
        .normalizedDifference(["B3", "B8"])
        .rename("NDWI");
    case "temperature":
      return ee
        .ImageCollection("MODIS/006/MOD11A1")
        .select("LST_Day_1km")
        .median()
        .multiply(0.02)
        .subtract(273.15)
        .rename("temperature");
    case "rgb":
      return ee
        .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .select(["B4", "B3", "B2"])
        .median();
  }
}

export async function GET(req: NextRequest) {
  try {
    await initEE();

    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const type = (searchParams.get("type") || "ndvi") as
      | "ndvi"
      | "ndwi"
      | "temperature"
      | "rgb";

    const bounds = [lng - 0.01, lat - 0.01, lng + 0.01, lat + 0.01];

    const image = getEEImage(type);

    const mapId = await new Promise<any>((resolve, reject) => {
      image.getMap(
        { min: 0, max: type === "ndvi" ? 1 : 3000, palette: ["red", "green"] },
        (err: any, mapInfo: any) => {
          if (err) return reject(err);
          resolve(mapInfo);
        }
      );
    });

    return NextResponse.json({
      success: true,
      coordinates: [lat, lng],
      analysisType: type,
      data: { tileUrl: mapId.urlFormat, mapId },
    });
  } catch (err: any) {
    console.error("[Farm Monitor GET Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
