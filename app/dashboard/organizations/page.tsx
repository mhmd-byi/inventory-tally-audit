'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import {
    Building2,
    Warehouse,
    Package,
    Plus,
    X,
    Check,
    Briefcase
} from 'lucide-react';

interface Organization {
    _id: string;
    name: string;
    code: string;
    email?: string;
    phone?: string;
    address?: string;
    status: string;
    createdAt: string;
}

interface Product {
    _id: string;
    name: string;
    sku: string;
    category: string;
    unit: string;
    createdAt: string;
}

export default function OrganizationsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [orgProducts, setOrgProducts] = useState<Product[]>([]);
    const [prodLoading, setProdLoading] = useState(false);

    const [formData, setFormData] = useState({ name: '', code: '', email: '', phone: '', address: '' });
    const [prodFormData, setProdFormData] = useState({ name: '', sku: '', category: '', unit: 'pcs', description: '' });

    const [error, setError] = useState('');
    const [prodError, setProdError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isAdmin = session?.user?.role === 'admin';
    const isStoreManager = session?.user?.role === 'store_manager';

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated' && !['admin', 'store_manager', 'auditor'].includes(session?.user?.role || '')) {
            router.push('/dashboard');
        }
    }, [status, session, router]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchOrganizations();
        }
    }, [status, session]);

    const fetchOrganizations = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/organizations');
            if (response.ok) {
                const data = await response.json();
                setOrganizations(data);
                if (data.length === 1 && !isAdmin) setSelectedOrg(data[0]);
            }
        } catch (err) { setError('Failed to load companies'); } finally { setLoading(false); }
    };

    const fetchProducts = async (orgId: string) => {
        try {
            setProdLoading(true);
            const response = await fetch('/api/products');
            if (response.ok) {
                const all = await response.json();
                setOrgProducts(all.filter((p: any) => p.organization?._id === orgId || p.organization === orgId));
            }
        } catch (err) { } finally { setProdLoading(false); }
    };

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setSuccess(''); setSubmitting(true);
        try {
            const res = await fetch('/api/organizations', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setSuccess(`Added company: ${formData.name}`);
                setFormData({ name: '', code: '', email: '', phone: '', address: '' });
                fetchOrganizations(); setTimeout(() => setShowCreateModal(false), 2000);
            } else { setError((await res.json()).error); }
        } catch (err) { setError('Error saving company'); } finally { setSubmitting(false); }
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault(); if (!selectedOrg) return; setSubmitting(true); setProdError('');
        try {
            const res = await fetch('/api/products', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...prodFormData, organizationId: selectedOrg._id }),
            });
            if (res.ok) { setProdFormData({ name: '', sku: '', category: '', unit: 'pcs', description: '' }); fetchProducts(selectedOrg._id); }
            else { setProdError((await res.json()).error); }
        } catch (err) { } finally { setSubmitting(false); }
    };

    if (status === 'loading') return null;

    return (
        <div className="min-h-screen bg-white text-black font-sans">
            <DashboardHeader />

            <main className="max-w-7xl mx-auto px-4 py-10">
                <div className="flex justify-between items-end mb-10 pb-6 border-b border-zinc-200">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Companies</h2>
                        <p className="text-zinc-500 font-medium text-sm mt-1">
                            Manage organization details and product catalogs
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-black text-white px-6 py-3 font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all flex items-center shadow-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Company
                        </button>
                    )}
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Company Name</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">Warehouses</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">Products</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {organizations.map((org) => (
                                <tr key={org._id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="text-base font-bold text-black">{org.name}</div>
                                        <div className="text-xs font-medium text-zinc-400 mt-0.5">ID: {org.code}</div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button
                                            onClick={() => router.push('/dashboard/warehouses')}
                                            className="border border-zinc-200 px-4 py-2 hover:border-black rounded-lg text-xs font-bold transition-all text-zinc-600"
                                        >
                                            View Warehouses
                                        </button>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button
                                            onClick={() => { setSelectedOrg(org); fetchProducts(org._id); setShowProductModal(true); }}
                                            className="bg-black text-white px-4 py-2 hover:bg-zinc-800 rounded-lg text-xs font-bold transition-all"
                                        >
                                            View Products
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Create Company Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
                        <h3 className="text-xl font-bold mb-6 border-b border-zinc-100 pb-4 text-black">Add New Company</h3>
                        <form onSubmit={handleCreateOrganization} className="space-y-4">
                            <input type="text" placeholder="Company Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm" />
                            <input type="text" placeholder="Unique Code" required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm" />
                            <div className="flex space-x-3 pt-6">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 font-bold text-sm border border-zinc-200 py-3 rounded-xl hover:bg-zinc-50">Cancel</button>
                                <button type="submit" className="flex-1 bg-black text-white py-3 font-bold text-sm rounded-xl hover:bg-zinc-800">Save Company</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Product Catalog Modal */}
            {showProductModal && selectedOrg && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-black">{selectedOrg.name} / Product Catalog</h3>
                                <p className="text-zinc-500 font-medium text-xs mt-1">Manage global product registry for this company</p>
                            </div>
                            <button onClick={() => setShowProductModal(false)} className="text-zinc-400 hover:text-black transition-all p-2"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center"><Package className="w-4 h-4 mr-3 text-black" /> Catalog Registry</h4>
                                {prodLoading ? <div className="p-10 text-center font-medium text-zinc-400">Loading catalog...</div> : (
                                    <div className="space-y-3">
                                        {orgProducts.map(p => (
                                            <div key={p._id} className="p-5 border border-zinc-100 bg-zinc-50/30 rounded-2xl flex justify-between items-center group">
                                                <div>
                                                    <p className="font-bold text-sm">{p.name}</p>
                                                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mt-1">SKU: {p.sku}</p>
                                                </div>
                                                <span className="text-[10px] font-bold text-zinc-300 uppercase">{p.unit}</span>
                                            </div>
                                        ))}
                                        {orgProducts.length === 0 && <div className="py-20 text-center border border-dashed border-zinc-200 rounded-3xl text-zinc-300 font-bold text-xs uppercase">No products listed</div>}
                                    </div>
                                )}
                            </div>
                            {(isAdmin || isStoreManager) && (
                                <div className="p-8 border border-zinc-100 bg-zinc-50 rounded-3xl self-start sticky top-0">
                                    <h4 className="text-xs font-bold uppercase tracking-widest mb-8 flex items-center text-zinc-500"><Plus className="w-4 h-4 mr-3 text-black" /> Add New Item</h4>
                                    <form onSubmit={handleCreateProduct} className="space-y-4">
                                        <input type="text" placeholder="Item Name" required value={prodFormData.name} onChange={e => setProdFormData({ ...prodFormData, name: e.target.value })} className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm shadow-sm" />
                                        <input type="text" placeholder="SKU / Unique Code" required value={prodFormData.sku} onChange={e => setProdFormData({ ...prodFormData, sku: e.target.value })} className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm shadow-sm" />
                                        <button type="submit" className="w-full py-4 bg-black text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all shadow-md">Add to Catalog</button>
                                    </form>
                                    {prodError && <p className="mt-4 text-xs font-bold text-red-500 text-center uppercase tracking-widest">{prodError}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
