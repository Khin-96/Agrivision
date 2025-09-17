import clientPromise from "./lib/mongodb";

async function test() {
  try {
    const client = await clientPromise;
    const db = client.db("agrivision");
    const collections = await db.listCollections().toArray();
    console.log("✅ MongoDB connected! Collections:", collections.map(c => c.name));
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  } finally {
    const client = await clientPromise;
    await client.close();
  }
}

test();
