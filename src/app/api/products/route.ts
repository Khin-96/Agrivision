// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const {
      name,
      description,
      price,
      category,
      quantity,
      unit,
      images,
      farmerId,
      farmerName,
      available
    } = data;

    // Validation
    if (!name || !description || !price || !category || !quantity || !unit || !farmerId || !farmerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure types
    const parsedPrice = parseFloat(price);
    const parsedQuantity = parseFloat(quantity);
    const parsedAvailable = available !== undefined ? Boolean(available) : true;

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parsedPrice,
        category,
        quantity: parsedQuantity,
        unit,
        images: Array.isArray(images) ? images : [images],
        farmerId,
        farmerName,
        available: parsedAvailable,
      },
    });

    return NextResponse.json({ message: 'Product created successfully', product }, { status: 201 });
  } catch (error) {
    console.error('Product creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
