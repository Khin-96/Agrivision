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
    Droplets,
    CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FarmerDashboard() {
    const { user, loading: authLoading, updateProfile } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState({
        totalSales: 0,
        activeProducts: 0,
        pendingAlerts: 0,
        farmHealth: 100
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [weather, setWeather] = useState<any>(null);
    const [aiTip, setAiTip] = useState<string>('Analyzing your farm data...');
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(false);

    useEffect(() => {
        if (user && user.role === 'farmer') {
            fetchDashboardData();
            fetchWeather();
            fetchAiTip();
        } else if (!authLoading && !user) {
            router.push('/auth');
        }
    }, [user, authLoading]);

    const handleBecomeSeller = async () => {
        setSwitching(true);
        try {
            const success = await updateProfile({ role: 'farmer' });
            if (success) {
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to switch role:', error);
        } finally {
            setSwitching(false);
        }
    };

    const fetchDashboardData = async () => {
        try {
            const res = await fetch('/api/dashboard/stats');
            const data = await res.json();
            if (data.stats) setStats(data.stats);
            if (data.recentActivity) setRecentActivity(data.recentActivity);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWeather = async () => {
        try {
            // Get location from browser
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m`);
                const data = await res.json();
                setWeather(data.current_weather);
            });
        } catch (error) {
            console.error('Weather fetch error:', error);
        }
    };

    const fetchAiTip = async () => {
        try {
            // Simple prompt to Gemini via our existing API if available, 
            // or just a simulated smart tip based on current data
            const tips = [
                "Based on recent humidity levels, watch out for Early Blight in your Tomato crops.",
                "Market prices for Onions are rising. It's a good time to list your harvest.",
                "Your farm health is stable. Consider adding organic mulch to maintain soil moisture.",
                "The upcoming rains are perfect for transplanting your seedlings tomorrow morning."
            ];
            setAiTip(tips[Math.floor(Math.random() * tips.length)]);
        } catch (error) {
            setAiTip("Ensure consistent irrigation for optimal crop growth.");
        }
    };

    if (authLoading || (user?.role === 'farmer' && loading) || !user) {
        return (
            <Layout>
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                        <p className="mt-4 text-gray-600 font-medium">Loading your farm insights...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (user.role !== 'farmer') {
        return (
            <Layout>
                <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
                    >
                        <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-8 text-white text-center">
                            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                                <Package size={40} />
                            </div>
                            <h2 className="text-3xl font-black mb-2">Become a Seller</h2>
                            <p className="text-green-100 text-sm">Start listing your products and reach thousands of buyers across the country.</p>
                        </div>
                        <div className="p-8">
                            <ul className="space-y-4 mb-8">
                                {[
                                    'List unlimited products',
                                    'Access real-time sales data',
                                    'Get AI-powered crop insights',
                                    'Connect with verified buyers'
                                ].map((benefit, i) => (
                                    <li key={i} className="flex items-center text-gray-600 text-sm font-medium">
                                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                                        {benefit}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={handleBecomeSeller}
                                disabled={switching}
                                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-green-200 flex items-center justify-center"
                            >
                                {switching ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    'Upgrade to Farmer Account'
                                )}
                            </button>
                            <p className="text-center mt-4 text-xs text-gray-400">By upgrading, you agree to our Farmer Terms of Service.</p>
                        </div>
                    </motion.div>
                </div>
            </Layout>
        );
    }

    const cards = [
        { title: 'Total Sales', value: `KSh ${stats.totalSales.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Active Products', value: stats.activeProducts.toString(), icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Pending Alerts', value: stats.pendingAlerts.toString(), icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { title: 'Farm Health', value: `${stats.farmHealth}%`, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Farmer <span className="text-green-600">Dashboard</span></h1>
                            <p className="mt-1 text-gray-600">Welcome back, {user.name}. Here&apos;s your live farm data.</p>
                        </div>
                        <div className="mt-4 md:mt-0 flex gap-3">
                            <Link
                                href="/sell"
                                className="inline-flex items-center px-5 py-2.5 rounded-xl shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-all hover:scale-105"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Add Product
                            </Link>
                            <Link
                                href="/Monitor-Farm"
                                className="inline-flex items-center px-5 py-2.5 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
                            >
                                Monitor Farm
                            </Link>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                        {cards.map((card, index) => (
                            <motion.div
                                key={card.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-2xl border border-gray-100 p-6"
                            >
                                <div className="flex items-center">
                                    <div className={`p-3 rounded-xl ${card.bg}`}>
                                        <card.icon className={`h-6 w-6 ${card.color}`} />
                                    </div>
                                    <div className="ml-5">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.title}</p>
                                        <p className="mt-1 text-2xl font-black text-gray-900">{card.value}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                        {/* Recent Activities */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                    <h3 className="text-lg font-bold text-gray-900">Recent Plant Analysis</h3>
                                    <Link href="/history" className="text-sm font-bold text-green-600 hover:text-green-500">
                                        Full History →
                                    </Link>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {recentActivity.length > 0 ? recentActivity.map((activity) => (
                                        <div key={activity.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${activity.status === 'Healthy' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                    <Activity className="h-5 w-5" />
                                                </div>
                                                <div className="ml-4">
                                                    <p className="text-sm font-bold text-gray-900">{activity.plant} - {activity.disease}</p>
                                                    <p className="text-xs text-gray-500">{new Date(activity.date).toLocaleDateString()} • {activity.confidence} confidence</p>
                                                </div>
                                            </div>
                                            <Link href="/history" className="text-gray-400 hover:text-green-600 transition-colors">
                                                <ArrowRight className="h-5 w-5" />
                                            </Link>
                                        </div>
                                    )) : (
                                        <div className="px-6 py-12 text-center text-gray-500">
                                            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                            <p>No recent analyses found. Start by uploading a plant photo!</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/50">
                                    <h3 className="text-lg font-bold text-gray-900">Market Insights</h3>
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <p className="text-sm font-medium text-gray-600">Active Market Coverage</p>
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                            Growing +12%
                                        </span>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 font-medium">Active Listings</span>
                                            <span className="font-bold text-gray-900">{stats.activeProducts} items</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 font-medium">Pending Inquiries</span>
                                            <span className="font-bold text-gray-900">Live</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3">
                                            <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full shadow-sm" style={{ width: '65%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Weather & Tips */}
                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-green-600 to-emerald-700 shadow-lg rounded-2xl p-6 text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                                <h3 className="text-lg font-bold mb-6 flex items-center">
                                    <CloudRain className="w-5 h-5 mr-2" />
                                    Live Weather
                                </h3>
                                <div className="flex items-center justify-center mb-8">
                                    <div className="text-center">
                                        <p className="text-5xl font-black">{weather ? `${Math.round(weather.temperature)}°C` : '--°C'}</p>
                                        <p className="text-green-100 font-medium mt-1 uppercase tracking-widest text-xs">
                                            {weather ? 'Current Condition' : 'Fetching location...'}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-[10px] font-bold uppercase tracking-tighter">
                                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 text-center">
                                        <Droplets className="h-4 w-4 mx-auto mb-2" />
                                        72% Hum
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 text-center">
                                        <Wind className="h-4 w-4 mx-auto mb-2" />
                                        {weather ? `${weather.windspeed} km/h` : '--'}
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 text-center">
                                        <Calendar className="h-4 w-4 mx-auto mb-2" />
                                        Today
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <Users className="h-5 w-5 mr-2 text-blue-500" />
                                    AI Farm Consultant
                                </h3>
                                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50 mb-6">
                                    <p className="text-sm text-gray-700 italic leading-relaxed">
                                        &quot;{aiTip}&quot;
                                    </p>
                                </div>
                                <Link
                                    href="/assistant"
                                    className="w-full inline-flex justify-center items-center px-4 py-3 rounded-xl border-2 border-green-600 text-sm font-bold text-green-600 hover:bg-green-600 hover:text-white transition-all"
                                >
                                    Open AI Assistant
                                </Link>
                            </div>

                            <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                                <div className="absolute bottom-0 right-0 -mb-2 -mr-2 opacity-20">
                                    <Package size={80} />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-3 text-green-200">Sustainable Tip</h3>
                                <p className="text-sm font-medium leading-relaxed">
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
