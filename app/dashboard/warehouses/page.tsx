'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { Warehouse as WarehouseIcon, MapPin, Building2 } from 'lucide-react';

interface Organization {
    _id: string;
    name: string;
    code: string;
}

interface Warehouse {
    _id: string;
    name: string;
    code: string;
    organization: Organization;
    location?: string;
    address?: string;
    status: string;
    createdAt: string;
}

export default function WarehousesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated' && !['admin', 'store_manager'].includes(session?.user?.role || '')) {
            router.push('/dashboard');
        }
    }, [status, session, router]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchWarehouses();
        }
    }, [status, session]);

    const fetchWarehouses = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/warehouses');
            if (response.ok) {
                const data = await response.json();
                setWarehouses(data);
            } else {
                setError((await response.json()).error || 'Failed to sync data');
            }
        } catch (err) { setError('Failed to load warehouse directory'); } finally { setLoading(false); }
    };

    if (status === 'loading') return null;

    if (!session || !['admin', 'store_manager'].includes(session.user?.role || '')) {
        return null;
    }

    return (
        <div className="min-h-screen bg-white text-black font-sans">
            <DashboardHeader />

            <main className="max-w-7xl mx-auto px-4 py-10">
                <div className="flex justify-between items-end mb-10 pb-6 border-b border-zinc-200">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Warehouse Locations</h2>
                        <p className="text-zinc-500 font-medium text-sm mt-1">
                            {session.user.role === 'admin' ? 'View all warehouse branches across the system' : 'View your assigned warehouse locations'}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-8 font-bold text-xs text-red-600 uppercase tracking-widest text-center">
                        {error}
                    </div>
                )}

                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Warehouse Name</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Location Code</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">Company</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {loading ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center font-bold text-xs text-zinc-300 uppercase italic">Updating directory...</td></tr>
                            ) : warehouses.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center font-bold text-xs text-zinc-300 uppercase">No warehouses registered</td></tr>
                            ) : (
                                warehouses.map((wh) => (
                                    <tr key={wh._id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="text-base font-bold text-black">{wh.name}</div>
                                            <div className="flex items-center text-xs font-medium text-zinc-400 mt-0.5">
                                                <MapPin className="w-3 h-3 mr-1.5" /> {wh.location || 'Address not set'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="font-mono text-xs font-bold border border-zinc-200 bg-white px-2 py-0.5 rounded uppercase">
                                                {wh.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="text-xs font-bold text-black inline-flex items-center space-x-2 border-b border-zinc-100 group">
                                                <Building2 className="w-3 h-3 text-zinc-400 group-hover:text-black transition-colors" />
                                                <span>{wh.organization?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${wh.status === 'active' ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                                                {wh.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
