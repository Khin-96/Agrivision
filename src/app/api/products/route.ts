// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// Helper function for error responses
function errorResponse(message: string, status: number = 500, details?: any) {
  console.error(`API Error [${status}]: ${message}`, details || '');
  return NextResponse.json({ 
    error: message,
    ...(details && { details: String(details) })
  }, { status });
}

// Helper function to establish database connection with retry logic
async function connectToDatabase(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Database connection attempt ${i + 1}/${retries}`);
      const client = await clientPromise;
      const db = client.db("agrivision");
      
      // Test the connection
      await db.admin().ping();
      console.log("Successfully connected to database:", db.databaseName);
      return { client, db };
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        throw new Error(`Failed to connect to database after ${retries} attempts: ${error}`);
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw new Error("Unexpected error in database connection");
}

// --- GET ---
export async function GET(request: NextRequest) {
  try {
    console.log("GET /api/products - Fetching products");
    
    const { client, db } = await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    console.log("Query parameters:", { sellerId });

    const query: any = {};
    if (sellerId) query.farmerId = sellerId;

    console.log("Executing query:", query);
    const products = await db
      .collection("products")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Found ${products.length} products`);

    // Optional: fetch farmer names (denormalized here)
    const formatted = products.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      farmerName: p.farmerName || "Unknown",
      status: p.available
        ? p.quantity > 10
          ? "Available"
          : p.quantity > 0
          ? "Limited"
          : "Out of Stock"
        : "Out of Stock",
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error("GET /api/products error:", err);
    return errorResponse("Failed to fetch products", 500, err.message);
  }
}

// --- POST ---
export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/products - Creating new product");
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.warn("POST /api/products - Unauthorized: No session found");
      return errorResponse("Unauthorized", 401);
    }

    console.log("Authenticated user:", session.user.id);
    
    let body;
    try {
      body = await request.json();
      console.log("Request body received:", Object.keys(body));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return errorResponse("Invalid JSON in request body", 400);
    }

    const { name, description, price, category, quantity, unit, images, available, rating, reviews } = body;

    if (!name || !price || !category) {
      console.warn("Missing required fields:", { name: !!name, price: !!price, category: !!category });
      return errorResponse("Missing required fields: name, price, and category are required", 400);
    }

    // Validate data types
    if (isNaN(Number(price)) || Number(price) <= 0) {
      return errorResponse("Price must be a positive number", 400);
    }

    if (quantity !== undefined && (isNaN(Number(quantity)) || Number(quantity) < 0)) {
      return errorResponse("Quantity must be a non-negative number", 400);
    }

    const { client, db } = await connectToDatabase();

    const newProduct = {
      name: String(name).trim(),
      description: String(description || "").trim(),
      price: Number(price),
      category: String(category).trim(),
      quantity: Number(quantity) || 0,
      unit: String(unit || "unit").trim(),
      images: Array.isArray(images) ? images : [],
      available: available !== false, // Default to true
      rating: Number(rating) || 0,
      reviews: Number(reviews) || 0,
      farmerId: session.user.id,
      farmerName: session.user.name || "Unknown",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Inserting product:", {
      name: newProduct.name,
      price: newProduct.price,
      category: newProduct.category,
      farmerId: newProduct.farmerId
    });

    const result = await db.collection("products").insertOne(newProduct);
    console.log("Product inserted with ID:", result.insertedId);

    // Return the product with the string ID
    const responseProduct = {
      ...newProduct,
      id: result.insertedId.toString(),
      _id: result.insertedId
    };

    return NextResponse.json(responseProduct, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/products error:", err);
    return errorResponse("Failed to create product", 500, err.message);
  }
}

// --- PUT ---
export async function PUT(request: NextRequest) {
  try {
    console.log("PUT /api/products - Updating product");
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.warn("PUT /api/products - Unauthorized: No session found");
      return errorResponse("Unauthorized", 401);
    }

    console.log("Authenticated user:", session.user.id);
    
    let body;
    try {
      body = await request.json();
      console.log("Update request for product ID:", body.id);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return errorResponse("Invalid JSON in request body", 400);
    }

    const { id, ...updates } = body;
    if (!id) {
      console.warn("PUT /api/products - Product ID required");
      return errorResponse("Product ID required", 400);
    }

    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return errorResponse("Invalid product ID format", 400);
    }

    const { client, db } = await connectToDatabase();

    console.log("Finding product with ID:", id);
    const product = await db.collection("products").findOne({ _id: objectId });
    
    if (!product) {
      console.warn("PUT /api/products - Product not found:", id);
      return errorResponse("Product not found", 404);
    }
    
    if (product.farmerId !== session.user.id) {
      console.warn("PUT /api/products - Unauthorized: User doesn't own this product");
      return errorResponse("Unauthorized: You can only edit your own products", 401);
    }

    // Prepare updates
    const updateData: any = { updatedAt: new Date() };
    
    if (updates.name !== undefined) updateData.name = String(updates.name).trim();
    if (updates.description !== undefined) updateData.description = String(updates.description).trim();
    if (updates.price !== undefined) {
      const price = Number(updates.price);
      if (isNaN(price) || price <= 0) {
        return errorResponse("Price must be a positive number", 400);
      }
      updateData.price = price;
    }
    if (updates.quantity !== undefined) {
      const quantity = Number(updates.quantity);
      if (isNaN(quantity) || quantity < 0) {
        return errorResponse("Quantity must be a non-negative number", 400);
      }
      updateData.quantity = quantity;
    }
    if (updates.category !== undefined) updateData.category = String(updates.category).trim();
    if (updates.unit !== undefined) updateData.unit = String(updates.unit).trim();
    if (updates.available !== undefined) updateData.available = Boolean(updates.available);
    if (updates.images !== undefined) {
      updateData.images = Array.isArray(updates.images) ? updates.images : [updates.images];
    }

    console.log("Applying updates:", Object.keys(updateData));
    await db.collection("products").updateOne(
      { _id: objectId }, 
      { $set: updateData }
    );

    const updatedProduct = await db.collection("products").findOne({ _id: objectId });
    console.log("Product updated successfully");

    return NextResponse.json({
      ...updatedProduct,
      id: updatedProduct?._id.toString()
    });
  } catch (err: any) {
    console.error("PUT /api/products error:", err);
    return errorResponse("Failed to update product", 500, err.message);
  }
}

// --- DELETE ---
export async function DELETE(request: NextRequest) {
  try {
    console.log("DELETE /api/products - Deleting product");
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.warn("DELETE /api/products - Unauthorized: No session found");
      return errorResponse("Unauthorized", 401);
    }

    console.log("Authenticated user:", session.user.id);
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      console.warn("DELETE /api/products - Product ID required");
      return errorResponse("Product ID required", 400);
    }

    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return errorResponse("Invalid product ID format", 400);
    }

    console.log("Deleting product with ID:", id);
    
    const { client, db } = await connectToDatabase();

    const product = await db.collection("products").findOne({ _id: objectId });
    
    if (!product) {
      console.warn("DELETE /api/products - Product not found:", id);
      return errorResponse("Product not found", 404);
    }
    
    if (product.farmerId !== session.user.id) {
      console.warn("DELETE /api/products - Unauthorized: User doesn't own this product");
      return errorResponse("Unauthorized: You can only delete your own products", 401);
    }

    await db.collection("products").deleteOne({ _id: objectId });
    console.log("Product deleted successfully");

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (err: any) {
    console.error("DELETE /api/products error:", err);
    return errorResponse("Failed to delete product", 500, err.message);
  }
}