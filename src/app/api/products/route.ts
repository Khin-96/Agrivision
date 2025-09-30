//src/app/api/products/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/products - Fetch products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const category = searchParams.get('category');
    const available = searchParams.get('available');

    let where: any = {};

    if (sellerId) {
      where.farmerId = sellerId;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (available === 'true') {
      where.available = true;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        farmer: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data to match frontend expectations
    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      category: product.category,
      quantity: Number(product.quantity),
      unit: product.unit,
      images: product.images,
      farmerId: product.farmerId,
      farmerName: product.farmer.name,
      available: product.available,
      rating: product.rating || 0,
      reviews: product.reviews || 0,
      status: product.status || (product.available ? 'Available' : 'Out of Stock'),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));

    return NextResponse.json(transformedProducts);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database to check verification status
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.idVerified) {
      return NextResponse.json(
        { error: 'ID verification required to list products' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      category,
      quantity,
      unit,
      images,
      available,
      status,
      rating,
      reviews,
    } = body;

    // Validate required fields
    if (!name || !description || !price || !category || !quantity || !unit || !images) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category,
        quantity: parseInt(quantity),
        unit,
        images,
        available: available !== undefined ? available : status === 'Available',
        status: status || 'Available',
        rating: rating || 0,
        reviews: reviews || 0,
        farmerId: user.id,
      },
      include: {
        farmer: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Transform the response
    const transformedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      category: product.category,
      quantity: Number(product.quantity),
      unit: product.unit,
      images: product.images,
      farmerId: product.farmerId,
      farmerName: product.farmer.name,
      available: product.available,
      rating: product.rating || 0,
      reviews: product.reviews || 0,
      status: product.status || (product.available ? 'Available' : 'Out of Stock'),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    return NextResponse.json(transformedProduct, { status: 201 });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// PUT /api/products - Update a product
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id,
      name,
      description,
      price,
      category,
      quantity,
      unit,
      images,
      available,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check if product exists and user owns it
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { farmer: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Verify user owns this product
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || existingProduct.farmerId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to update this product' },
        { status: 403 }
      );
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name || existingProduct.name,
        description: description || existingProduct.description,
        price: price !== undefined ? parseFloat(price) : existingProduct.price,
        category: category || existingProduct.category,
        quantity: quantity !== undefined ? parseInt(quantity) : existingProduct.quantity,
        unit: unit || existingProduct.unit,
        images: images || existingProduct.images,
        available: available !== undefined ? available : (status === 'Available'),
        status: status || existingProduct.status,
      },
      include: {
        farmer: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Transform the response
    const transformedProduct = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      description: updatedProduct.description,
      price: Number(updatedProduct.price),
      category: updatedProduct.category,
      quantity: Number(updatedProduct.quantity),
      unit: updatedProduct.unit,
      images: updatedProduct.images,
      farmerId: updatedProduct.farmerId,
      farmerName: updatedProduct.farmer.name,
      available: updatedProduct.available,
      rating: updatedProduct.rating || 0,
      reviews: updatedProduct.reviews || 0,
      status: updatedProduct.status || (updatedProduct.available ? 'Available' : 'Out of Stock'),
      createdAt: updatedProduct.createdAt,
      updatedAt: updatedProduct.updatedAt,
    };

    return NextResponse.json(transformedProduct);
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/products - Delete a product
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check if product exists and user owns it
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Verify user owns this product
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || existingProduct.farmerId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this product' },
        { status: 403 }
      );
    }

    // Delete product
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}