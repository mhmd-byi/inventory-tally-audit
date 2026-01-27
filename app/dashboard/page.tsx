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
    Clock
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
            <div className="min-h-screen flex items-center justify-center bg-white text-black">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    if (!session) return null;

    const statCards = [
        {
            title: 'Hubs Tracking',
            value: loadingStats ? '...' : stats.totalOrganizations.toString(),
            label: 'Active Entities',
            icon: Building2,
        },
        {
            title: 'Audit Catalog',
            value: loadingStats ? '...' : stats.totalProducts?.toString() || '0',
            label: 'SKUs Managed',
            icon: Package,
        },
        {
            title: 'Stock Floor',
            value: loadingStats ? '...' : stats.totalInventoryValue?.toString() || '0',
            label: 'System Units',
            icon: TrendingUp,
        },
        {
            title: 'Margin Status',
            value: loadingStats ? '...' : stats.activeDiscrepancies.toString(),
            label: 'Variation Found',
            icon: AlertTriangle,
        },
    ];

    return (
        <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
            <DashboardHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-12 flex justify-between items-end border-b border-zinc-100 pb-8">
                    <div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">
                            Terminal / {session.user?.name?.split(' ')[0]}
                        </h2>
                        <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">
                            {session.user.role === 'admin' ? 'Nexus Global Controller' : 'Localized Hub Operations'}
                        </p>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 mb-1 flex items-center justify-end"><Clock className="w-3 h-3 mr-2" /> Real-Time Sync</p>
                        <p className="text-xl font-black font-mono tracking-tighter">{currentTime.toLocaleTimeString([], { hour12: false })}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div key={index} className="bg-white border-2 border-zinc-100 p-8 hover:border-black transition-all group">
                                <div className="flex items-center justify-between mb-6">
                                    <Icon className="w-6 h-6 text-zinc-400 group-hover:text-black transition-colors" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">Metric 0{index + 1}</span>
                                </div>
                                <p className="text-4xl font-black tracking-tighter mb-1">{stat.value}</p>
                                <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{stat.title}</h3>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 border-2 border-zinc-100 p-8 rounded-none">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] flex items-center">
                                <History className="w-4 h-4 mr-3" /> Operational Log
                            </h3>
                            <button className="text-[10px] font-black uppercase tracking-widest hover:underline">Full Report</button>
                        </div>
                        <div className="space-y-6">
                            {[1].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 border border-zinc-50 hover:bg-zinc-50 transition-colors">
                                    <div className="flex items-center space-x-6">
                                        <div className="w-2 h-2 bg-black rounded-full"></div>
                                        <div>
                                            <p className="text-sm font-black text-black uppercase">Session Initialized</p>
                                            <p className="text-[10px] font-bold text-zinc-400">Inventory Management System Online</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-zinc-300">0.1s Ago</span>
                                </div>
                            ))}
                            <div className="py-20 text-center border-2 border-dashed border-zinc-100">
                                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">End of Active Stream</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] pl-2 border-l-4 border-black mb-6">Control Panel</h3>

                        {session.user.role === 'admin' && (
                            <>
                                <button onClick={() => router.push('/dashboard/organizations')} className="w-full flex items-center justify-between p-6 border-2 border-zinc-100 hover:bg-black hover:text-white transition-all transform hover:-translate-y-1">
                                    <div className="flex flex-col text-left">
                                        <span className="text-xs font-black uppercase tracking-widest">Global Hubs</span>
                                        <span className="text-[9px] font-bold opacity-50">Manage Organizations</span>
                                    </div>
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                                <button onClick={() => router.push('/dashboard/users')} className="w-full flex items-center justify-between p-6 border-2 border-zinc-100 hover:bg-black hover:text-white transition-all transform hover:-translate-y-1">
                                    <div className="flex flex-col text-left">
                                        <span className="text-xs font-black uppercase tracking-widest">Access Control</span>
                                        <span className="text-[9px] font-bold opacity-50">System Identity List</span>
                                    </div>
                                    <Users className="w-5 h-5" />
                                </button>
                            </>
                        )}

                        <button onClick={() => router.push('/dashboard/organizations')} className="w-full flex items-center justify-between p-6 border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all transform hover:-translate-y-1">
                            <div className="flex flex-col text-left">
                                <span className="text-xs font-black uppercase tracking-widest">Live Audit</span>
                                <span className="text-[9px] font-bold opacity-50">Physical Verification Module</span>
                            </div>
                            <Package className="w-5 h-5" />
                        </button>

                        <button onClick={() => router.push('/dashboard/warehouses')} className="w-full flex items-center justify-between p-6 border-2 border-zinc-100 hover:bg-black hover:text-white transition-all transform hover:-translate-y-1">
                            <div className="flex flex-col text-left">
                                <span className="text-xs font-black uppercase tracking-widest">Network</span>
                                <span className="text-[9px] font-bold opacity-50">Warehouse Locations</span>
                            </div>
                            <Warehouse className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
