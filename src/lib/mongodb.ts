// lib/mongodb.ts - Fixed version for Node.js 20
import { MongoClient, MongoClientOptions } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI not defined in environment variables");
}

const uri = process.env.MONGODB_URI;

// Updated options to handle Node.js 20 TLS issues
const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 30000, // Increased timeout
  connectTimeoutMS: 30000, // Increased timeout
  socketTimeoutMS: 30000, // Added socket timeout
  maxPoolSize: 10,
  minPoolSize: 5,
  appName: "Agrivision",
  
  // Force TLS version and handle certificate validation
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
  
  // Additional options for Node.js 20 compatibility
  family: 4, // Force IPv4
  
  // Retry logic
  retryWrites: true,
  retryReads: true,
  
  // Connection management
  maxIdleTimeMS: 30000,
  //serverSelectionRetryDelayMS: 2000,
};

// For development, you might want to be more permissive
if (process.env.NODE_ENV === "development") {
  console.log("MongoDB: Development mode - using relaxed TLS settings");
  options.tlsAllowInvalidCertificates = true;
  options.tlsAllowInvalidHostnames = true;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    console.log("Creating new MongoDB client (development)...");
    console.log("MongoDB URI (masked):", uri.replace(/\/\/.*@/, "//***:***@"));
    
    client = new MongoClient(uri, options);
    
    // Add connection event listeners for debugging
    client.on('serverOpening', () => {
      console.log('MongoDB: Server connection opening...');
    });
    
    client.on('serverClosed', () => {
      console.log('MongoDB: Server connection closed');
    });
    
    client.on('error', (error) => {
      console.error('MongoDB Client Error:', error);
    });
    
    global._mongoClientPromise = client.connect().catch((error) => {
      console.error('MongoDB Connection Error:', error);
      // Reset the promise so it can be retried
      delete global._mongoClientPromise;
      throw error;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  console.log("Creating new MongoDB client (production)...");
  client = new MongoClient(uri, options);
  
  clientPromise = client.connect().catch((error) => {
    console.error('MongoDB Production Connection Error:', error);
    throw error;
  });
}

// Test connection function
export async function testConnection() {
  try {
    const client = await clientPromise;
    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB: Connection test successful");
    return true;
  } catch (error) {
    console.error("MongoDB: Connection test failed", error);
    return false;
  }
}

export default clientPromise;