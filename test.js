// test.js
import { MongoClient } from "mongodb";

const uri = "mongodb+srv://mehinzanno_db_user:agrivision@agrivision.t94y7wf.mongodb.net/agrivision?retryWrites=true&w=majority&appName=Agrivision";

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  appName: "Agrivision",
});

async function test() {
  try {
    await client.connect();
    const db = client.db("agrivision");
    const collections = await db.listCollections().toArray();
    console.log("✅ MongoDB connected! Collections:", collections.map(c => c.name));
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  } finally {
    try {
      await client.close();
      // log closed only if connected
      console.log("🔒 MongoDB client closed.");
    } catch (closeErr) {
      // ignore close errors
    }
  }
}

test();
