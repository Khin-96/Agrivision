// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { available: true },
      include: {
        farmer: {
          select: {
            name: true,
            id: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      quantity: product.quantity,
      unit: product.unit,
      images: product.images,
      farmerId: product.farmerId,
      farmerName: product.farmer.name,
      available: product.available,
      rating: product.rating,
      reviews: product.reviews
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      farmerId,
      farmerName,
      available,
      rating,
      reviews
    } = body;

    // Verify the user is the farmer they claim to be
    if (session.user.id !== farmerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        category,
        quantity,
        unit,
        images,
        farmerId,
        available,
        rating,
        reviews
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
