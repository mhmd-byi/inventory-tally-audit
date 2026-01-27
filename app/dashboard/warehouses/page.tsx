'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { Warehouse as WarehouseIcon, MapPin, Activity, Building2, Search } from 'lucide-react';

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
                setError((await response.json()).error || 'Sync Error');
            }
        } catch (err) { setError('Failed to load directory'); } finally { setLoading(false); }
    };

    if (status === 'loading') return null;

    if (!session || !['admin', 'store_manager'].includes(session.user?.role || '')) {
        return null;
    }

    return (
        <div className="min-h-screen bg-white text-black">
            <DashboardHeader />

            <main className="max-w-7xl mx-auto px-4 py-12">
                <div className="flex justify-between items-end mb-12 border-b-4 border-black pb-8">
                    <div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter">System / Network</h2>
                        <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-2 px-1 border-l-2 border-black">
                            {session.user.role === 'admin' ? 'Global Operational Node Directory' : 'Assigned Hub Mapping'}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="border-2 border-dashed border-black p-4 mb-8 text-[10px] font-black uppercase tracking-widest text-center">
                        {error}
                    </div>
                )}

                <div className="border-4 border-black bg-white overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-black text-white">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Operational Node</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Logic Code</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-right">Owner Hub</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-right">Activity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-zinc-100">
                            {loading ? (
                                <tr><td colSpan={4} className="px-8 py-12 text-center font-black uppercase tracking-widest text-[10px] italic">Accessing Lattice Data...</td></tr>
                            ) : warehouses.length === 0 ? (
                                <tr><td colSpan={4} className="px-8 py-12 text-center font-black uppercase tracking-widest text-[10px] text-zinc-300">No nodes provisioned</td></tr>
                            ) : (
                                warehouses.map((wh) => (
                                    <tr key={wh._id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="text-sm font-black uppercase tracking-tight">{wh.name}</div>
                                            <div className="flex items-center text-[10px] font-bold text-zinc-400 mt-1 uppercase">
                                                <MapPin className="w-3 h-3 mr-1.5" /> {wh.location || 'Unknown Coordinates'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 uppercase font-mono text-xs font-black">
                                            <span className="border-2 border-zinc-100 px-2 py-0.5">{wh.code}</span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="text-[10px] font-black uppercase tracking-widest inline-flex items-center space-x-2 border-b-2 border-black">
                                                <Building2 className="w-3 h-3" />
                                                <span>{wh.organization?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className={`text-[9px] font-black uppercase tracking-widest border-2 px-3 py-1 ${wh.status === 'active' ? 'border-black bg-black text-white' : 'border-zinc-200 text-zinc-300'}`}>
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
