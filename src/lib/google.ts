// lib/google.ts
import { GoogleAuth } from "google-auth-library";
import path from "path";

// Authenticate using the service-account.json file
export async function getGoogleClient() {
  const keyFile = path.join(process.cwd(), "service-account.json");
  const auth = new GoogleAuth({
    keyFilename: keyFile,
    scopes: ["https://www.googleapis.com/auth/earthengine"],
  });

  return await auth.getClient();
}

// Call the Earth Engine REST API
export async function callEarthEngine(
  client: any,
  requestBody: Record<string, any>
) {
  const url =
    "https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps";

  const res = await client.request({
    url,
    method: "POST",
    data: requestBody,
  });

  return res.data;
}
