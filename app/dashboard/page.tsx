'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import {
    Building2,
    Warehouse,
    History,
    AlertTriangle,
    Users,
    Package,
    ArrowRight,
    TrendingUp,
    Clock,
    Briefcase
} from 'lucide-react';

interface DashboardStats {
    totalOrganizations: number;
    totalWarehouses: number;
    completedAudits: number;
    activeDiscrepancies: number;
    totalUsers: number;
    totalProducts?: number;
    totalInventoryValue?: number;
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [stats, setStats] = useState<DashboardStats>({
        totalOrganizations: 0,
        totalWarehouses: 0,
        completedAudits: 0,
        activeDiscrepancies: 0,
        totalUsers: 0
    });
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchStats();
        }
    }, [status, router]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchStats = async () => {
        try {
            setLoadingStats(true);
            const response = await fetch('/api/dashboard/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoadingStats(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    if (!session) return null;

    const statCards = [
        {
            title: 'Companies',
            value: loadingStats ? '...' : stats.totalOrganizations.toString(),
            label: 'Total Hubs',
            icon: Building2,
        },
        {
            title: 'Products',
            value: loadingStats ? '...' : stats.totalProducts?.toString() || '0',
            label: 'Items Tracked',
            icon: Package,
        },
        {
            title: 'Current Stock',
            value: loadingStats ? '...' : stats.totalInventoryValue?.toString() || '0',
            label: 'Total Units',
            icon: TrendingUp,
        },
        {
            title: 'Discrepancies',
            value: loadingStats ? '...' : stats.activeDiscrepancies.toString(),
            label: 'Total Variance',
            icon: AlertTriangle,
        },
    ];

    return (
        <div className="min-h-screen bg-white text-black font-sans">
            <DashboardHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-10 flex justify-between items-end pb-8 border-b border-zinc-100">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-black">
                            Welcome, {session.user?.name?.split(' ')[0]}
                        </h2>
                        <p className="text-zinc-500 font-medium text-sm mt-1">
                            {session.user.role === 'admin' ? 'System Overview' : 'Manage your organization inventory'}
                        </p>
                    </div>
                    <div className="hidden md:block text-right">
                        <div className="flex items-center justify-end text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">
                            <Clock className="w-3 h-3 mr-2" /> Live Time
                        </div>
                        <p className="text-xl font-bold tracking-tight">{currentTime.toLocaleTimeString([], { hour12: false })}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        const isDiscrepancy = stat.title === 'Discrepancies' && Number(stat.value) > 0;
                        return (
                            <div key={index} className="bg-white border border-zinc-200 p-8 rounded-2xl hover:border-black transition-all group shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div className={`p-2 rounded-lg transition-all ${isDiscrepancy ? 'bg-red-50 text-red-600' : 'bg-zinc-50 text-zinc-400'
                                        } group-hover:bg-black group-hover:text-white`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Stat 0{index + 1}</span>
                                </div>
                                <p className={`text-4xl font-bold tracking-tight mb-1 ${isDiscrepancy ? 'text-red-600' : 'text-black'
                                    }`}>{stat.value}</p>
                                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{stat.title}</h3>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 border border-zinc-200 p-8 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-base font-bold flex items-center">
                                <History className="w-5 h-5 mr-3 text-zinc-400" /> Recent Activity
                            </h3>
                            <button className="text-xs font-bold hover:underline text-zinc-400">View History</button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-transparent hover:border-zinc-200 transition-all">
                                <div className="flex items-center space-x-4">
                                    <div className="w-2 h-2 bg-black rounded-full"></div>
                                    <div>
                                        <p className="text-sm font-bold text-black">Dashboard Initialized</p>
                                        <p className="text-xs text-zinc-500">System is ready for use</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-zinc-300">Just Now</span>
                            </div>
                            <div className="py-16 text-center">
                                <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">No further activities</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-6 pl-3 border-l-2 border-black">Quick Actions</h3>

                        {session.user.role === 'admin' && (
                            <>
                                <button onClick={() => router.push('/dashboard/organizations')} className="w-full flex items-center justify-between p-6 border border-zinc-200 bg-white rounded-2xl hover:border-black transition-all group shadow-sm">
                                    <div className="flex flex-col text-left">
                                        <span className="text-sm font-bold">Manage Companies</span>
                                        <span className="text-xs text-zinc-400">Add or edit organizations</span>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-zinc-300 group-hover:text-black transition-all" />
                                </button>
                                <button onClick={() => router.push('/dashboard/users')} className="w-full flex items-center justify-between p-6 border border-zinc-200 bg-white rounded-2xl hover:border-black transition-all group shadow-sm">
                                    <div className="flex flex-col text-left">
                                        <span className="text-sm font-bold">Manage Users</span>
                                        <span className="text-xs text-zinc-400">Control system access</span>
                                    </div>
                                    <Users className="w-5 h-5 text-zinc-300 group-hover:text-black transition-all" />
                                </button>
                            </>
                        )}

                        <button onClick={() => router.push('/dashboard/organizations')} className="w-full flex items-center justify-between p-6 border border-black bg-black text-white rounded-2xl hover:bg-zinc-800 transition-all shadow-lg group">
                            <div className="flex flex-col text-left">
                                <span className="text-sm font-bold">New Audit Session</span>
                                <span className="text-xs opacity-70">Begin physical count at a location</span>
                            </div>
                            <Briefcase className="w-5 h-5 text-white/50 group-hover:text-white transition-all" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
