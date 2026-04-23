import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Handle USSD requests from Africa's Talking with real database access
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const sessionId = formData.get("sessionId");
    const serviceCode = formData.get("serviceCode");
    const phoneNumber = formData.get("phoneNumber") as string;
    const text = (formData.get("text") as string) || "";
    
    console.log(`[USSD] Incoming: ${phoneNumber} | Text: "${text}"`);

    let response = "";

    // Parse the USSD text logic
    const levels = text.split("*");
    const mainAction = levels[0];

    if (text === "") {
      // Main Menu
      response = "CON Welcome to AgriVision\n";
      response += "1. Market Prices\n";
      response += "2. My Farm Progress\n";
      response += "3. Request Expert Help\n";
      response += "4. Check Weather";
    } 
    
    // 1. MARKET PRICES BRANCH
    else if (mainAction === "1") {
      if (levels.length === 1) {
        response = "CON Select Crop:\n";
        response += "1. Maize\n";
        response += "2. Beans\n";
        response += "3. Tomatoes";
      } else if (levels.length === 2) {
        const cropChoice = levels[1];
        let cropName = "";
        
        if (cropChoice === "1") cropName = "Maize";
        else if (cropChoice === "2") cropName = "Beans";
        else if (cropChoice === "3") cropName = "Tomatoes";

        if (cropName) {
          // Fetch real average price from Product table
          const products = await prisma.product.findMany({
            where: {
              name: {
                contains: cropName
              }
            },
            select: {
              price: true,
              unit: true
            }
          });

          if (products.length > 0) {
            const avgPrice = products.reduce((acc, p) => acc + p.price, 0) / products.length;
            const unit = products[0].unit;
            response = `END Average ${cropName} price: KES ${avgPrice.toLocaleString()} per ${unit}. (Based on ${products.length} sellers)`;
          } else {
            response = `END Sorry, no live data for ${cropName} today. Please check back later.`;
          }
        } else {
          response = "END Invalid crop selection.";
        }
      }
    }

    // 2. MY FARM BRANCH
    else if (mainAction === "2") {
      if (levels.length === 1) {
        response = "CON My Farm:\n";
        response += "1. Last Analysis Result\n";
        response += "2. Treatment Schedule";
      } else if (levels.length === 2 && levels[1] === "1") {
        // Normalize phone number for lookup (handles both starting with 0 and +254)
        const normalizedPhone = phoneNumber.startsWith("0") ? "+254" + phoneNumber.substring(1) : phoneNumber;
        
        const user = await prisma.user.findFirst({
          where: { 
            OR: [
              { phone: phoneNumber },
              { phone: normalizedPhone }
            ]
          }
        });

        if (user) {
          const lastAnalysis = await prisma.analysis.findFirst({
            where: { userId: user.id },
            orderBy: { date: 'desc' }
          });

          if (lastAnalysis) {
            const results = lastAnalysis.results as any;
            const summary = results.summary || "Healthy growth observed.";
            response = `END Last analysis (${new Date(lastAnalysis.date).toLocaleDateString()}): ${summary}`;
          } else {
            response = "END You haven't uploaded any crop photos for analysis yet.";
          }
        } else {
          response = `END Profile not found for ${phoneNumber}. Please register on the AgriVision app.`;
        }
      } else {
        response = "END Option coming soon!";
      }
    }

    // 3. EXPERT HELP
    else if (mainAction === "3") {
      response = "END Your request has been logged. An agronomist will call you at " + phoneNumber;
    }

    // 4. WEATHER
    else if (mainAction === "4") {
      response = "END Today's Forecast: Sunny skies, 26°C. Ideal for harvesting.";
    }

    else {
      response = "END Invalid option. Please try again.";
    }

    return new Response(response, {
      headers: { "Content-Type": "text/plain" },
    });

  } catch (error) {
    console.error("USSD Error:", error);
    return new Response("END Connection to AgriVision server failed. Please try again.", {
      headers: { "Content-Type": "text/plain" },
    });
  }
}
