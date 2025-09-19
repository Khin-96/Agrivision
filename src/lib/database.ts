import { MongoClient, Db, Collection } from 'mongodb';
import mongoose, { Schema, Document, Model } from 'mongoose';

// Environment configuration
const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'farm_monitoring';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

/**
 * MongoDB Native Driver Connection (for simple operations)
 */
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  try {
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Mongoose Connection (for complex operations with schemas)
 */
let isConnected = false;

export async function connectToMongoose(): Promise<void> {
  if (isConnected) return;

  try {
    const options = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(MONGODB_URI, options);
    isConnected = true;
    console.log('Connected to MongoDB via Mongoose');
  } catch (error) {
    console.error('Mongoose connection error:', error);
    throw error;
  }
}

/**
 * Type Definitions
 */

// GeoJSON Point
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

// GeoJSON Polygon
export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // Array of coordinate arrays
}

// Farm Point Interface
export interface IFarmPoint {
  id: string;
  name: string;
  type: 'irrigation' | 'sensor' | 'landmark' | 'problem_area';
  coordinates: [number, number]; // [longitude, latitude]
  metadata?: {
    description?: string;
    installDate?: Date;
    status?: 'active' | 'inactive' | 'maintenance';
    sensorType?: string;
    irrigationCapacity?: number;
    [key: string]: any;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// Farm Document Interface
export interface IFarm extends Document {
  userId: string;
  name: string;
  description?: string;
  boundary?: GeoPolygon;
  points: IFarmPoint[];
  totalArea?: number; // in hectares
  cropType?: string;
  plantingDate?: Date;
  expectedHarvestDate?: Date;
  metadata?: {
    soilType?: string;
    irrigationType?: string;
    climate?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// User Document Interface
export interface IUser extends Document {
  email: string;
  name: string;
  farmIds: string[];
  preferences?: {
    defaultLayer?: 'ndvi' | 'moisture' | 'temperature' | 'rgb';
    notifications?: boolean;
    units?: 'metric' | 'imperial';
  };
  createdAt: Date;
  updatedAt: Date;
}

// Satellite Analysis Document Interface
export interface ISatelliteAnalysis extends Document {
  farmId: string;
  userId: string;
  layerType: 'ndvi' | 'moisture' | 'temperature' | 'rgb';
  analysisDate: Date;
  bounds: number[]; // [minLng, minLat, maxLng, maxLat]
  dateRange: {
    start: Date;
    end: Date;
  };
  results: {
    averageValues?: {
      ndvi?: number;
      moisture?: number;
      temperature?: number;
    };
    zoneAnalysis?: Array<{
      pointId: string;
      pointType: string;
      values: {
        mean: number;
        stdDev: number;
        min: number;
        max: number;
      };
    }>;
    insights?: string[];
    recommendations?: string[];
  };
  tileUrl?: string;
  createdAt: Date;
}

/**
 * Mongoose Schemas
 */

// Farm Point Schema
const FarmPointSchema = new Schema<IFarmPoint>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['irrigation', 'sensor', 'landmark', 'problem_area'],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: (v: number[]) => v.length === 2,
      message: 'Coordinates must be an array of exactly 2 numbers [longitude, latitude]',
    },
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  _id: false, // Don't create separate _id for subdocuments
});

// Farm Schema with GeoJSON support
const FarmSchema = new Schema<IFarm>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  boundary: {
    type: {
      type: String,
      enum: ['Polygon'],
    },
    coordinates: {
      type: [[[Number]]],
    },
  },
  points: [FarmPointSchema],
  totalArea: { type: Number }, // hectares
  cropType: { type: String, trim: true },
  plantingDate: { type: Date },
  expectedHarvestDate: { type: Date },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  collection: 'farms',
});

// Create geospatial index for farm boundaries
FarmSchema.index({ boundary: '2dsphere' });
FarmSchema.index({ userId: 1, name: 1 }, { unique: true });

// User Schema
const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  farmIds: [{ type: String }],
  preferences: {
    defaultLayer: {
      type: String,
      enum: ['ndvi', 'moisture', 'temperature', 'rgb'],
      default: 'ndvi',
    },
    notifications: { type: Boolean, default: true },
    units: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric',
    },
  },
}, {
  timestamps: true,
  collection: 'users',
});

// Satellite Analysis Schema
const SatelliteAnalysisSchema = new Schema<ISatelliteAnalysis>({
  farmId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  layerType: {
    type: String,
    enum: ['ndvi', 'moisture', 'temperature', 'rgb'],
    required: true,
  },
  analysisDate: { type: Date, default: Date.now },
  bounds: {
    type: [Number],
    required: true,
    validate: {
      validator: (v: number[]) => v.length === 4,
      message: 'Bounds must be an array of exactly 4 numbers [minLng, minLat, maxLng, maxLat]',
    },
  },
  dateRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  results: {
    averageValues: {
      ndvi: { type: Number },
      moisture: { type: Number },
      temperature: { type: Number },
    },
    zoneAnalysis: [{
      pointId: { type: String, required: true },
      pointType: { type: String, required: true },
      values: {
        mean: { type: Number, required: true },
        stdDev: { type: Number, required: true },
        min: { type: Number, required: true },
        max: { type: Number, required: true },
      },
    }],
    insights: [{ type: String }],
    recommendations: [{ type: String }],
  },
  tileUrl: { type: String },
}, {
  timestamps: true,
  collection: 'satellite_analyses',
});

// Compound indexes for efficient querying
SatelliteAnalysisSchema.index({ farmId: 1, layerType: 1, analysisDate: -1 });
SatelliteAnalysisSchema.index({ userId: 1, analysisDate: -1 });

/**
 * Mongoose Models
 */
export const Farm: Model<IFarm> = mongoose.models.Farm || mongoose.model<IFarm>('Farm', FarmSchema);
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const SatelliteAnalysis: Model<ISatelliteAnalysis> = mongoose.models.SatelliteAnalysis || 
  mongoose.model<ISatelliteAnalysis>('SatelliteAnalysis', SatelliteAnalysisSchema);

/**
 * Database Utility Functions
 */

// Calculate farm area from polygon coordinates
export function calculateFarmArea(boundary: GeoPolygon): number {
  if (!boundary || !boundary.coordinates || boundary.coordinates.length === 0) {
    return 0;
  }

  // Using the shoelace formula for polygon area calculation
  const coords = boundary.coordinates[0];
  let area = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    area += (x1 * y2) - (x2 * y1);
  }

  // Convert from square degrees to hectares (approximate)
  // 1 degree ≈ 111.32 km at equator
  const areaInSquareMeters = Math.abs(area / 2) * (111320 ** 2);
  const areaInHectares = areaInSquareMeters / 10000;

  return Math.round(areaInHectares * 100) / 100; // Round to 2 decimal places
}

// Validate GeoJSON polygon
export function validatePolygon(boundary: GeoPolygon): boolean {
  if (!boundary || boundary.type !== 'Polygon') return false;
  if (!boundary.coordinates || boundary.coordinates.length === 0) return false;
  
  const coords = boundary.coordinates[0];
  if (coords.length < 4) return false; // Minimum 4 points for a closed polygon
  
  // Check if first and last coordinates are the same (closed polygon)
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) return false;
  
  return true;
}

// Farm-specific database operations
export class FarmService {
  // Create a new farm
  static async createFarm(farmData: Partial<IFarm>): Promise<IFarm> {
    await connectToMongoose();
    
    // Calculate area if boundary is provided
    if (farmData.boundary && validatePolygon(farmData.boundary)) {
      farmData.totalArea = calculateFarmArea(farmData.boundary);
    }
    
    const farm = new Farm(farmData);
    return await farm.save();
  }

  // Get farms by user ID
  static async getFarmsByUser(userId: string): Promise<IFarm[]> {
    await connectToMongoose();
    return await Farm.find({ userId }).sort({ updatedAt: -1 });
  }

  // Get farm by ID
  static async getFarmById(farmId: string, userId: string): Promise<IFarm | null> {
    await connectToMongoose();
    return await Farm.findOne({ _id: farmId, userId });
  }

  // Update farm
  static async updateFarm(farmId: string, userId: string, updates: Partial<IFarm>): Promise<IFarm | null> {
    await connectToMongoose();
    
    // Recalculate area if boundary is updated
    if (updates.boundary && validatePolygon(updates.boundary)) {
      updates.totalArea = calculateFarmArea(updates.boundary);
    }
    
    return await Farm.findOneAndUpdate(
      { _id: farmId, userId },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );
  }

  // Delete farm
  static async deleteFarm(farmId: string, userId: string): Promise<boolean> {
    await connectToMongoose();
    const result = await Farm.deleteOne({ _id: farmId, userId });
    return result.deletedCount > 0;
  }

  // Add point to farm
  static async addPointToFarm(farmId: string, userId: string, point: IFarmPoint): Promise<IFarm | null> {
    await connectToMongoose();
    return await Farm.findOneAndUpdate(
      { _id: farmId, userId },
      { 
        $push: { points: point },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );
  }

  // Remove point from farm
  static async removePointFromFarm(farmId: string, userId: string, pointId: string): Promise<IFarm | null> {
    await connectToMongoose();
    return await Farm.findOneAndUpdate(
      { _id: farmId, userId },
      { 
        $pull: { points: { id: pointId } },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );
  }

  // Search farms by location (within bounds)
  static async searchFarmsByLocation(bounds: number[]): Promise<IFarm[]> {
    await connectToMongoose();
    
    const [minLng, minLat, maxLng, maxLat] = bounds;
    
    return await Farm.find({
      boundary: {
        $geoIntersects: {
          $geometry: {
            type: 'Polygon',
            coordinates: [[
              [minLng, minLat],
              [maxLng, minLat],
              [maxLng, maxLat],
              [minLng, maxLat],
              [minLng, minLat]
            ]]
          }
        }
      }
    });
  }
}

// Satellite Analysis Service
export class SatelliteAnalysisService {
  // Save analysis results
  static async saveAnalysis(analysisData: Partial<ISatelliteAnalysis>): Promise<ISatelliteAnalysis> {
    await connectToMongoose();
    const analysis = new SatelliteAnalysis(analysisData);
    return await analysis.save();
  }

  // Get latest analysis for farm
  static async getLatestAnalysis(
    farmId: string, 
    userId: string, 
    layerType?: string
  ): Promise<ISatelliteAnalysis | null> {
    await connectToMongoose();
    
    const filter: any = { farmId, userId };
    if (layerType) filter.layerType = layerType;
    
    return await SatelliteAnalysis.findOne(filter).sort({ analysisDate: -1 });
  }

  // Get analysis history
  static async getAnalysisHistory(
    farmId: string, 
    userId: string, 
    limit: number = 10
  ): Promise<ISatelliteAnalysis[]> {
    await connectToMongoose();
    
    return await SatelliteAnalysis.find({ farmId, userId })
      .sort({ analysisDate: -1 })
      .limit(limit);
  }

  // Compare analyses over time
  static async compareAnalyses(
    farmId: string, 
    userId: string, 
    layerType: string,
    startDate: Date,
    endDate: Date
  ): Promise<ISatelliteAnalysis[]> {
    await connectToMongoose();
    
    return await SatelliteAnalysis.find({
      farmId,
      userId,
      layerType,
      analysisDate: { $gte: startDate, $lte: endDate }
    }).sort({ analysisDate: 1 });
  }
}

// User Service
export class UserService {
  // Create user
  static async createUser(userData: Partial<IUser>): Promise<IUser> {
    await connectToMongoose();
    const user = new User(userData);
    return await user.save();
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<IUser | null> {
    await connectToMongoose();
    return await User.findOne({ email });
  }

  // Update user
  static async updateUser(userId: string, updates: Partial<IUser>): Promise<IUser | null> {
    await connectToMongoose();
    return await User.findByIdAndUpdate(userId, updates, { new: true });
  }

  // Add farm to user
  static async addFarmToUser(userId: string, farmId: string): Promise<IUser | null> {
    await connectToMongoose();
    return await User.findByIdAndUpdate(
      userId,
      { $addToSet: { farmIds: farmId } },
      { new: true }
    );
  }
}

/**
 * Database Indexes and Initialization
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await connectToMongoose();
    
    // Ensure indexes are created
    await Farm.ensureIndexes();
    await User.ensureIndexes();
    await SatelliteAnalysis.ensureIndexes();
    
    console.log('Database indexes initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Health check function
 */
export async function checkDatabaseHealth(): Promise<{ status: string; details?: any }> {
  try {
    const { db } = await connectToDatabase();
    const ping = await db.admin().ping();
    
    return {
      status: 'healthy',
      details: {
        ping,
        collections: await db.listCollections().toArray(),
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}