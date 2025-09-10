// app/api/auth/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Fetching user data...');
    const session = await getServerSession(authOptions);

    // If no valid session
    if (!session?.user?.email) {
      console.warn('❌ No session found for user data request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Session found for user:', session.user.email);

    // Get full user from DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        idVerified: true,
        image: true,
        idFrontUrl: true,
        idBackUrl: true,
        idType: true,
        phone: true,
        address: true,
        farmName: true,
        farmLocation: true,
        farmSize: true,
        farmType: true,
      },
    });

    if (!user) {
      console.warn('❌ User not found in database:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('✅ User data fetched successfully');
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('❌ User data fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    console.log('🔄 Updating user profile...');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.warn('❌ No session found for profile update');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('📦 Update data received:', body);

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: body.name,
        phone: body.phone,
        address: body.address,
        farmName: body.farmName,
        farmLocation: body.farmLocation,
        farmSize: body.farmSize,
        farmType: body.farmType,
        idVerified: body.idVerified !== undefined ? body.idVerified : undefined,
        idFrontUrl: body.idFrontUrl !== undefined ? body.idFrontUrl : undefined,
        idBackUrl: body.idBackUrl !== undefined ? body.idBackUrl : undefined,
        idType: body.idType !== undefined ? body.idType : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        idVerified: true,
        image: true,
        idFrontUrl: true,
        idBackUrl: true,
        idType: true,
        phone: true,
        address: true,
        farmName: true,
        farmLocation: true,
        farmSize: true,
        farmType: true,
      },
    });

    console.log('✅ Profile updated successfully');
    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}