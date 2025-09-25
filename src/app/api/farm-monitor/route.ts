import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

// Types
type AnalysisType = 'ndvi' | 'ndwi' | 'temperature' | 'rgb';

interface QueryParams {
  lat: string;
  lng: string;
  type: AnalysisType;
}

interface EarthEngineResponse {
  tileUrl: string;
}

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Logging
function log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (data) console[level](logMessage, data);
  else console[level](logMessage);
}

// Earth Engine config
const EARTH_ENGINE_CONFIG = {
  serviceAccountPath: process.env.EARTH_ENGINE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'service-account.json'),
  satellites: {
    sentinel2: 'COPERNICUS/S2_SR_HARMONIZED',
    landsat8: 'LANDSAT/LC08/C02/T1_L2',
  },
};

// Analysis configurations
const ANALYSIS_CONFIGS = {
  ndvi: {
    name: 'NDVI',
    collection: EARTH_ENGINE_CONFIG.satellites.sentinel2,
    bands: ['B8', 'B4'],
    palette: ['#d73027','#f46d43','#fdae61','#fee08b','#e6f598','#abdda4','#66c2a5','#3288bd','#5e4fa2'],
    min: -1,
    max: 1,
  },
  ndwi: {
    name: 'NDWI',
    collection: EARTH_ENGINE_CONFIG.satellites.sentinel2,
    bands: ['B3', 'B8'],
    palette: ['#ffffcc','#a1dab4','#41b6c4','#2c7fb8','#253494'],
    min: -1,
    max: 1,
  },
  temperature: {
    name: 'Temperature',
    collection: EARTH_ENGINE_CONFIG.satellites.landsat8,
    bands: ['ST_B10'],
    palette: ['#000080','#0000ff','#00ffff','#00ff00','#ffff00','#ff0000','#800000'],
    min: 0,
    max: 50,
  },
  rgb: {
    name: 'RGB',
    collection: EARTH_ENGINE_CONFIG.satellites.sentinel2,
    bands: ['B4','B3','B2'],
    min: 0,
    max: 3000,
  },
};

// Earth Engine globals
let ee: any = null;
let isEEInitialized = false;
let initializationPromise: Promise<boolean> | null = null;
let initializationError: string | null = null;

// Load service account
function loadServiceAccount(): ServiceAccount {
  if (!existsSync(EARTH_ENGINE_CONFIG.serviceAccountPath)) {
    throw new Error(`Service account file not found at ${EARTH_ENGINE_CONFIG.serviceAccountPath}`);
  }
  const data = readFileSync(EARTH_ENGINE_CONFIG.serviceAccountPath, 'utf8');
  const account: ServiceAccount = JSON.parse(data);
  if (!account.private_key || !account.client_email || !account.project_id) {
    throw new Error('Invalid service account JSON: missing required fields');
  }
  return account;
}

// Initialize Earth Engine robustly
async function initializeEarthEngine(retries = 2): Promise<boolean> {
  if (isEEInitialized) return true;
  if (initializationError) throw new Error(`Previous initialization failed: ${initializationError}`);
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        ee = require('@google/earthengine');
        const serviceAccount = loadServiceAccount();

        await new Promise<void>((resolve, reject) => {
          ee.data.authenticateViaPrivateKey(serviceAccount, () => {
            ee.initialize(null, null, resolve, reject);
          }, reject);
        });

        isEEInitialized = true;
        log('info', 'Earth Engine initialized successfully');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown EE initialization error';
        log('error', `EE initialization attempt ${attempt} failed: ${message}`);
        initializationError = message;
        initializationPromise = null;

        if (attempt > retries) throw new Error(`EE failed after ${attempt} attempts: ${message}`);
        log('warn', 'Retrying Earth Engine initialization...');
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    return false;
  })();

  return initializationPromise;
}

// Validate query parameters
function validateQueryParams(searchParams: URLSearchParams): QueryParams | { error: string } {
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const type = searchParams.get('type');

  if (!lat || !lng || !type) return { error: 'Missing required parameters: lat, lng, and type are required' };

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) return { error: 'Invalid coordinates: lat and lng must be numbers' };
  if (!['ndvi','ndwi','temperature','rgb'].includes(type)) return { error: 'Invalid type parameter' };

  return { lat, lng, type: type as AnalysisType };
}

// Cache
const cache = new Map<string, { data: EarthEngineResponse; timestamp: number; hits: number }>();
const CACHE_DURATION = 10 * 60 * 1000;
const MAX_CACHE_SIZE = 1000;
function getCacheKey(lat: string, lng: string, type: AnalysisType): string {
  const roundedLat = Math.round(parseFloat(lat) * 100) / 100;
  const roundedLng = Math.round(parseFloat(lng) * 100) / 100;
  return `${roundedLat}_${roundedLng}_${type}`;
}
function getFromCache(key: string): EarthEngineResponse | null {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  cached.hits++;
  cached.timestamp = Date.now();
  return cached.data;
}
function setCache(key: string, data: EarthEngineResponse) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries()).sort(([,a],[,b])=>b.hits-a.hits);
    entries.slice(MAX_CACHE_SIZE/2).forEach(([k])=>cache.delete(k));
  }
  cache.set(key, { data, timestamp: Date.now(), hits:1 });
}

// Create Earth Engine analysis
async function createEarthEngineAnalysis(lat: number, lng: number, analysisType: AnalysisType): Promise<string> {
  try {
    await initializeEarthEngine();
  } catch (err) {
    log('error', 'Failed to initialize Earth Engine during analysis', err);
    throw new Error('Earth Engine not initialized');
  }

  const config = ANALYSIS_CONFIGS[analysisType];
  const point = ee.Geometry.Point([lng, lat]);
  const aoi = point.buffer(50000); // 50km buffer

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - 6);

  let collection = ee.ImageCollection(config.collection)
    .filterBounds(aoi)
    .filterDate(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',30))
    .sort('CLOUDY_PIXEL_PERCENTAGE');

  const collectionSize = await collection.size().getInfo();
  if (collectionSize === 0) throw new Error('No satellite imagery found');

  const image = collection.first();
  let processedImage: any, visParams: any;

  switch (analysisType) {
    case 'ndvi':
      processedImage = image.normalizedDifference(['B8','B4']).rename('NDVI');
      visParams = { min: config.min, max: config.max, palette: config.palette };
      break;
    case 'ndwi':
      processedImage = image.normalizedDifference(['B3','B8']).rename('NDWI');
      visParams = { min: config.min, max: config.max, palette: config.palette };
      break;
    case 'temperature':
      const landsatCollection = ee.ImageCollection(EARTH_ENGINE_CONFIG.satellites.landsat8)
        .filterBounds(aoi)
        .filterDate(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
        .filter(ee.Filter.lt('CLOUD_COVER',30))
        .sort('CLOUD_COVER');
      const landsatImage = landsatCollection.first();
      processedImage = landsatImage.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15).rename('Temperature');
      visParams = { min: config.min, max: config.max, palette: config.palette };
      break;
    case 'rgb':
      processedImage = image.select(['B4','B3','B2']);
      visParams = { bands:['B4','B3','B2'], min: config.min, max: config.max };
      break;
  }

  const mapId = await new Promise<any>((resolve,reject)=>{
    const timeout = setTimeout(()=>reject(new Error('Map tile generation timeout')),60000);
    processedImage.getMap(visParams,(result,error)=>{
      clearTimeout(timeout);
      if(error) reject(error);
      else resolve(result);
    });
  });

  if (!mapId.urlFormat) throw new Error('No tile URL generated');
  return mapId.urlFormat;
}

// GET API
export async function GET(request: NextRequest) {
  try {
    const params = validateQueryParams(request.nextUrl.searchParams);
    if('error' in params) return NextResponse.json({ error: params.error }, { status: 400 });

    const { lat, lng, type } = params;
    const cacheKey = getCacheKey(lat,lng,type);
    const cached = getFromCache(cacheKey);
    if(cached) return NextResponse.json(cached);

    try {
      const tileUrl = await createEarthEngineAnalysis(parseFloat(lat),parseFloat(lng),type);
      const response: EarthEngineResponse = { tileUrl };
      setCache(cacheKey,response);
      return NextResponse.json(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Earth Engine error';
      log('error', 'Failed to generate Earth Engine tile', err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    log('error', 'GET /api/farm-monitor failed', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST health check
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    if(action === 'health'){
      return NextResponse.json({
        status: isEEInitialized ? 'healthy' : 'initializing',
        eeInitialized: isEEInitialized,
        cacheSize: cache.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    }
    return NextResponse.json({ error:'Unknown action'},{status:400});
  } catch {
    return NextResponse.json({ error:'Invalid JSON in request body'},{status:400});
  }
}