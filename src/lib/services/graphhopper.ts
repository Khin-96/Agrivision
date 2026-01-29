// lib/services/graphhopper.ts
/**
 * GraphHopper Service
 * Handles routing, geocoding, and mapping with GraphHopper API
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  instruction?: string;
  distance?: number;
  time?: number;
}

export interface Route {
  distance: number; // in meters
  time: number; // in milliseconds
  points: RoutePoint[];
  instructions: RouteInstruction[];
  bbox: number[]; // [minLon, minLat, maxLon, maxLat]
}

export interface RouteInstruction {
  text: string;
  distance: number;
  time: number;
  sign: number;
  interval: number[];
  street_name?: string;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  name: string;
  country?: string;
  city?: string;
  state?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
}

export interface IsochroneOptions {
  point: Coordinate;
  time_limit: number; // in seconds
  buckets?: number;
  reverse_flow?: boolean;
}

const GRAPHHOPPER_API_KEY = process.env.NEXT_PUBLIC_GRAPHHOPPER_API_KEY || "";
const GRAPHHOPPER_BASE_URL = "https://graphhopper.com/api/1";

/**
 * Get route between two points
 */
export async function getRoute(
  from: Coordinate,
  to: Coordinate,
  vehicle: "car" | "foot" | "bike" = "car"
): Promise<Route | null> {
  try {
    const url = `${GRAPHHOPPER_BASE_URL}/route?point=${from.lat},${from.lng}&point=${to.lat},${to.lng}&vehicle=${vehicle}&locale=en&instructions=true&calc_points=true&points_encoded=false&key=${GRAPHHOPPER_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GraphHopper API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.paths || data.paths.length === 0) {
      return null;
    }

    const path = data.paths[0];

    return {
      distance: path.distance,
      time: path.time,
      points: path.points.coordinates.map((coord: number[]) => ({
        lng: coord[0],
        lat: coord[1],
      })),
      instructions: path.instructions || [],
      bbox: path.bbox,
    };
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
}

/**
 * Get multiple alternative routes
 */
export async function getAlternativeRoutes(
  from: Coordinate,
  to: Coordinate,
  vehicle: "car" | "foot" | "bike" = "car",
  maxAlternatives: number = 3
): Promise<Route[]> {
  try {
    const url = `${GRAPHHOPPER_BASE_URL}/route?point=${from.lat},${from.lng}&point=${to.lat},${to.lng}&vehicle=${vehicle}&locale=en&instructions=true&calc_points=true&points_encoded=false&algorithm=alternative_route&alternative_route.max_paths=${maxAlternatives}&key=${GRAPHHOPPER_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GraphHopper API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.paths || data.paths.length === 0) {
      return [];
    }

    return data.paths.map((path: any) => ({
      distance: path.distance,
      time: path.time,
      points: path.points.coordinates.map((coord: number[]) => ({
        lng: coord[0],
        lat: coord[1],
      })),
      instructions: path.instructions || [],
      bbox: path.bbox,
    }));
  } catch (error) {
    console.error("Error fetching alternative routes:", error);
    return [];
  }
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const url = `${GRAPHHOPPER_BASE_URL}/geocode?q=${encodeURIComponent(address)}&locale=en&key=${GRAPHHOPPER_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GraphHopper Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.hits || data.hits.length === 0) {
      return null;
    }

    const hit = data.hits[0];

    return {
      lat: hit.point.lat,
      lng: hit.point.lng,
      name: hit.name,
      country: hit.country,
      city: hit.city,
      state: hit.state,
      street: hit.street,
      housenumber: hit.housenumber,
      postcode: hit.postcode,
    };
  } catch (error) {
    console.error("Error geocoding address:", error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(coord: Coordinate): Promise<GeocodingResult | null> {
  try {
    const url = `${GRAPHHOPPER_BASE_URL}/geocode?reverse=true&point=${coord.lat},${coord.lng}&locale=en&key=${GRAPHHOPPER_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GraphHopper Reverse Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.hits || data.hits.length === 0) {
      return null;
    }

    const hit = data.hits[0];

    return {
      lat: hit.point.lat,
      lng: hit.point.lng,
      name: hit.name,
      country: hit.country,
      city: hit.city,
      state: hit.state,
      street: hit.street,
      housenumber: hit.housenumber,
      postcode: hit.postcode,
    };
  } catch (error) {
    console.error("Error reverse geocoding:", error);
    return null;
  }
}

/**
 * Get isochrone (reachable area within time limit)
 */
export async function getIsochrone(
  options: IsochroneOptions
): Promise<any | null> {
  try {
    const { point, time_limit, buckets = 1, reverse_flow = false } = options;
    const url = `${GRAPHHOPPER_BASE_URL}/isochrone?point=${point.lat},${point.lng}&time_limit=${time_limit}&buckets=${buckets}&reverse_flow=${reverse_flow}&key=${GRAPHHOPPER_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GraphHopper Isochrone API error (${response.status}): ${response.statusText || errorText || 'Unknown Error'}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching isochrone:", error);
    return null;
  }
}

/**
 * Calculate distance between two points (in meters)
 */
export function calculateDistance(from: Coordinate, to: Coordinate): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
    Math.cos(toRad(to.lat)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format time for display
 */
export function formatTime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
}
