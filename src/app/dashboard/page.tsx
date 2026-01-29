'use client';

import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Users,
    Package,
    AlertCircle,
    Plus,
    ArrowRight,
    Activity,
    Calendar,
    CloudRain,
    Thermometer,
    Droplets
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FarmerDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState({
        totalSales: 0,
        activeProducts: 0,
        pendingAlerts: 0,
        farmHealth: 85
    });

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'farmer')) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    if (authLoading || !user) {
        return (
            <Layout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                </div>
            </Layout>
        );
    }

    const cards = [
        { title: 'Total Sales', value: 'KSh 124,500', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Active Products', value: '12', icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'New Alerts', value: '3', icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { title: 'Farm Health', value: '85%', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
                            <p className="mt-1 text-gray-600">Welcome back, {user.name}. Here&apos;s what&apos;s happening on your farm.</p>
                        </div>
                        <div className="mt-4 md:mt-0 flex space-x-3">
                            <Link
                                href="/sell"
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Add Product
                            </Link>
                            <Link
                                href="/Monitor-Farm"
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                                Monitor Farm
                            </Link>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                        {cards.map((card, index) => (
                            <motion.div
                                key={card.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white overflow-hidden shadow rounded-xl border border-gray-100 p-6"
                            >
                                <div className="flex items-center">
                                    <div className={`p-3 rounded-lg ${card.bg}`}>
                                        <card.icon className={`h-6 w-6 ${card.color}`} />
                                    </div>
                                    <div className="ml-5">
                                        <p className="text-sm font-medium text-gray-500 truncate">{card.title}</p>
                                        <p className="mt-1 text-2xl font-semibold text-gray-900">{card.value}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                        {/* Recent Activities */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-lg font-medium text-gray-900">Recent Disease Analysis</h3>
                                    <Link href="/history" className="text-sm font-medium text-green-600 hover:text-green-500">
                                        View history
                                    </Link>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {[
                                        { id: 1, plant: 'Tomato', disease: 'Early Blight', confidence: '94%', date: '2 hours ago', status: 'Warning' },
                                        { id: 2, plant: 'Maize', disease: 'Healthy', confidence: '98%', date: 'Yesterday', status: 'Healthy' },
                                        { id: 3, plant: 'Potato', disease: 'Late Blight', confidence: '82%', date: 'Jan 24, 2026', status: 'Critical' },
                                    ].map((analysis) => (
                                        <div key={analysis.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${analysis.status === 'Healthy' ? 'bg-green-100 text-green-600' :
                                                        analysis.status === 'Warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                                                    }`}>
                                                    <Activity className="h-5 w-5" />
                                                </div>
                                                <div className="ml-4">
                                                    <p className="text-sm font-medium text-gray-900">{analysis.plant} - {analysis.disease}</p>
                                                    <p className="text-xs text-gray-500">{analysis.date} • {analysis.confidence} confidence</p>
                                                </div>
                                            </div>
                                            <Link href={`/results/${analysis.id}`} className="text-gray-400 hover:text-gray-600">
                                                <ArrowRight className="h-5 w-5" />
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100">
                                    <h3 className="text-lg font-medium text-gray-900">Market Insights</h3>
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm text-gray-600">Top selling crop this week</p>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Onion +12%
                                        </span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Your Sales Volume</span>
                                            <span className="font-semibold">KSh 45,200</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Pending Orders</span>
                                            <span className="font-semibold">8 orders</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Weather & Tips */}
                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 shadow rounded-xl p-6 text-white text-center">
                                <h3 className="text-lg font-semibold mb-4">Local Weather</h3>
                                <div className="flex justify-center items-center mb-4">
                                    <CloudRain className="h-12 w-12 mr-4" />
                                    <div className="text-left">
                                        <p className="text-3xl font-bold">24°C</p>
                                        <p className="text-green-100">Scattered Showers</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-green-100">
                                    <div className="bg-white/10 p-2 rounded-lg">
                                        <Droplets className="h-4 w-4 mx-auto mb-1" />
                                        72% Hum
                                    </div>
                                    <div className="bg-white/10 p-2 rounded-lg">
                                        <Wind className="h-4 w-4 mx-auto mb-1" />
                                        12 km/h
                                    </div>
                                    <div className="bg-white/10 p-2 rounded-lg">
                                        <Thermometer className="h-4 w-4 mx-auto mb-1" />
                                        26° Max
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white shadow rounded-xl border border-gray-100 p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                    <Users className="h-5 w-5 mr-2 text-blue-500" />
                                    AI Farm Consultant
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    &quot;Based on local weather patterns, we recommend increasing irrigation for your maize fields tonight as a dry spell is expected.&quot;
                                </p>
                                <Link
                                    href="/assistant"
                                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-green-600 rounded-md text-sm font-medium text-green-600 hover:bg-green-50 transition-colors"
                                >
                                    Talk to Assistant
                                </Link>
                            </div>

                            <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                                <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-2">Sustainable Tip</h3>
                                <p className="text-sm text-emerald-700">
                                    Using mulch around your tomato plants helps retain moisture and prevents soil-borne diseases from splashing onto leaves.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

function Wind(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
            <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
            <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
        </svg>
    );
}
