// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/products - Fetching products');
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId'); // optional

    const whereClause: any = {};
    if (sellerId) {
      whereClause.farmerId = sellerId;
      console.log(`Filtering products by sellerId: ${sellerId}`);
    }

    const products = await prisma.product.findMany({
      where: whereClause,
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

    console.log(`Found ${products.length} products`);

    // Map the products to include the status field
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
      reviews: product.reviews,
      // Calculate status based on availability and quantity
      status: product.available ? 
        (product.quantity > 10 ? 'Available' : 
         product.quantity > 0 ? 'Limited' : 'Out of Stock') : 
        'Out of Stock'
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
    console.log('POST /api/products - Creating new product');
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.error('Unauthorized: No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Product data received:', body);

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

    if (session.user.id !== farmerId) {
      console.error(`Unauthorized: Session user ID (${session.user.id}) doesn't match farmer ID (${farmerId})`);
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
        rating: rating || 0,
        reviews: reviews || 0
      }
    });

    console.log(`Product created successfully with ID: ${product.id}`);
    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// --- PUT: Update a product ---
export async function PUT(request: NextRequest) {
  try {
    console.log('PUT /api/products - Updating product');
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error('Unauthorized: No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Update data received:', body);

    const {
      id,
      name,
      description,
      price,
      category,
      quantity,
      unit,
      images,
      available
    } = body;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      console.error(`Product not found with ID: ${id}`);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    if (product.farmerId !== session.user.id) {
      console.error(`Unauthorized: Product owner (${product.farmerId}) doesn't match session user (${session.user.id})`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { name, description, price, category, quantity, unit, images, available }
    });

    console.log(`Product updated successfully with ID: ${id}`);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// --- DELETE: Remove a product ---
export async function DELETE(request: NextRequest) {
  try {
    console.log('DELETE /api/products - Deleting product');
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error('Unauthorized: No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      console.error('Product ID required for deletion');
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      console.error(`Product not found with ID: ${id}`);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    if (product.farmerId !== session.user.id) {
      console.error(`Unauthorized: Product owner (${product.farmerId}) doesn't match session user (${session.user.id})`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.product.delete({ where: { id } });
    console.log(`Product deleted successfully with ID: ${id}`);
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}