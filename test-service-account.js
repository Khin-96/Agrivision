import { GoogleAuth } from "google-auth-library";
import fetch from "node-fetch";

const serviceAccountPath = "./service-account.json";

async function testGeocoding() {
  const auth = new GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();

  // Build request
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=Nairobi`;
  const res = await client.request({ url });

  console.log("Response:", res.data);
}

testGeocoding().catch(console.error);
