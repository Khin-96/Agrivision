import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 1. Active Products Count
        const activeProducts = await prisma.product.count({
            where: {
                farmerId: user.id,
                available: true,
            },
        });

        // 2. Total Sales (Simulated for now based on 'Sold' status products)
        const soldProducts = await prisma.product.findMany({
            where: {
                farmerId: user.id,
                status: 'Sold',
            },
            select: { price: true },
        });
        const totalSales = soldProducts.reduce((sum, p) => sum + p.price, 0);

        // 3. New Alerts (Recent analyses with issues)
        const recentAnalyses = await prisma.analysis.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                },
            },
        });

        const alertsCount = recentAnalyses.filter((a: any) => {
            const results = a.results as any;
            return results?.health === 'diseased' || results?.diseaseDetection?.isHealthy === false;
        }).length;

        // 4. Farm Health (Average from recent analyses)
        const allAnalyses = await prisma.analysis.findMany({
            where: { userId: user.id },
            take: 10,
            orderBy: { date: 'desc' },
        });

        let farmHealth = 100;
        if (allAnalyses.length > 0) {
            const healthyCount = allAnalyses.filter((a: any) => {
                const results = a.results as any;
                return results?.health === 'healthy' || results?.diseaseDetection?.isHealthy === true;
            }).length;
            farmHealth = Math.round((healthyCount / allAnalyses.length) * 100);
        }

        // 5. Recent Activity List
        const recentActivity = allAnalyses.map(a => ({
            id: a.id,
            plant: (a.results as any)?.plantIdentification?.className || (a.results as any)?.name || 'Unknown',
            disease: (a.results as any)?.diseaseDetection?.diseaseName || (a.results as any)?.disease || 'Healthy',
            confidence: (a.results as any)?.diseaseDetection?.confidence || (a.results as any)?.confidence || '95%',
            date: a.date,
            status: ((a.results as any)?.health === 'healthy' || (a.results as any)?.diseaseDetection?.isHealthy === true) ? 'Healthy' : 'Warning'
        }));

        return NextResponse.json({
            stats: {
                totalSales,
                activeProducts,
                pendingAlerts: alertsCount,
                farmHealth
            },
            recentActivity
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
    }
}
