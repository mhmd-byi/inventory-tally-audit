'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import {
    Building2,
    Warehouse as WarehouseIcon,
    Package,
    Plus,
    X,
    Check,
    Briefcase,
    MapPin,
    ClipboardList,
    Upload,
    FileSpreadsheet,
    AlertCircle
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

interface Warehouse {
    _id: string;
    name: string;
    code: string;
    location?: string;
    status: string;
}

export default function CompaniesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

    // Product Modal States
    const [showProductModal, setShowProductModal] = useState(false);
    const [orgProducts, setOrgProducts] = useState<Product[]>([]);
    const [prodLoading, setProdLoading] = useState(false);

    // Warehouse Modal States
    const [showWarehouseModal, setShowWarehouseModal] = useState(false);
    const [orgWarehouses, setOrgWarehouses] = useState<Warehouse[]>([]);
    const [whLoading, setWhLoading] = useState(false);

    const [formData, setFormData] = useState({ name: '', code: '', email: '', phone: '', address: '' });
    const [prodFormData, setProdFormData] = useState({ name: '', sku: '', category: '', unit: 'pcs', description: '' });
    const [whFormData, setWhFormData] = useState({ name: '', code: '', location: '' });

    const [error, setError] = useState('');
    const [prodError, setProdError] = useState('');
    const [whError, setWhError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkSummary, setBulkSummary] = useState<any>(null);

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

    const fetchWarehouses = async (orgId: string) => {
        try {
            setWhLoading(true);
            const response = await fetch(`/api/warehouses?organizationId=${orgId}`);
            if (response.ok) {
                const data = await response.json();
                setOrgWarehouses(data);
            }
        } catch (err) { } finally { setWhLoading(false); }
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

    const handleCreateWarehouse = async (e: React.FormEvent) => {
        e.preventDefault(); if (!selectedOrg) return; setSubmitting(true); setWhError('');
        try {
            const res = await fetch('/api/warehouses', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...whFormData, organization: selectedOrg._id }),
            });
            if (res.ok) {
                setWhFormData({ name: '', code: '', location: '' });
                fetchWarehouses(selectedOrg._id);
            }
            else { setWhError((await res.json()).error); }
        } catch (err) { } finally { setSubmitting(false); }
    };

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedOrg) return;

        setBulkUploading(true);
        setProdError('');
        setBulkSummary(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', selectedOrg._id);

        try {
            const res = await fetch('/api/products/bulk', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                setBulkSummary(data.summary);
                fetchProducts(selectedOrg._id);
                setSuccess('Bulk upload processed successfully');
            } else {
                setProdError(data.error);
            }
        } catch (err) {
            setProdError('Failed to upload file');
        } finally {
            setBulkUploading(false);
            // Reset input
            e.target.value = '';
        }
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
                            Manage organizations, catalog registry and warehouse networks
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
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">Locations</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">Inventory Catalog</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {organizations.map((org) => (
                                <tr key={org._id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="text-base font-bold text-black">{org.name}</div>
                                        <div className="text-xs font-medium text-zinc-400 mt-0.5 uppercase tracking-widest font-mono">{org.code}</div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button
                                            onClick={() => { setSelectedOrg(org); fetchWarehouses(org._id); setShowWarehouseModal(true); }}
                                            className="border border-zinc-200 px-4 py-2 hover:border-black rounded-lg text-xs font-bold transition-all text-zinc-600 inline-flex items-center"
                                        >
                                            <WarehouseIcon className="w-3 h-3 mr-2" />
                                            Warehouses
                                        </button>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button
                                            onClick={() => { setSelectedOrg(org); fetchProducts(org._id); setShowProductModal(true); }}
                                            className="bg-black text-white px-4 py-2 hover:bg-zinc-800 rounded-lg text-xs font-bold transition-all inline-flex items-center"
                                        >
                                            <Package className="w-3 h-3 mr-2" />
                                            Products
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
                            {error && <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>}
                            {success && <p className="text-xs font-bold text-green-500 uppercase tracking-widest">{success}</p>}
                            <div className="flex space-x-3 pt-6">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 font-bold text-sm border border-zinc-200 py-3 rounded-xl hover:bg-zinc-50">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 bg-black text-white py-3 font-bold text-sm rounded-xl hover:bg-zinc-800 disabled:opacity-50">Save Company</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Warehouse Management Modal */}
            {showWarehouseModal && selectedOrg && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-black">{selectedOrg.name} / Warehouse Network</h3>
                                <p className="text-zinc-500 font-medium text-xs mt-1">Manage operational nodes and physical locations</p>
                            </div>
                            <button onClick={() => setShowWarehouseModal(false)} className="text-zinc-400 hover:text-black transition-all p-2"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center"><WarehouseIcon className="w-4 h-4 mr-3 text-black" /> Registered Branches</h4>
                                {whLoading ? <div className="p-10 text-center font-medium text-zinc-400">Syncing directory...</div> : (
                                    <div className="space-y-3">
                                        {orgWarehouses.map(wh => (
                                            <div key={wh._id} className="p-5 border border-zinc-100 bg-zinc-50/10 rounded-2xl flex justify-between items-center group hover:border-black transition-colors">
                                                <div>
                                                    <p className="font-bold text-sm">{wh.name}</p>
                                                    <div className="flex items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-1">
                                                        <MapPin className="w-3 h-3 mr-1" /> {wh.location || 'Location Not Set'}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => router.push(`/dashboard/warehouses/${wh._id}`)}
                                                    className="p-2.5 bg-zinc-50 text-black border border-zinc-200 rounded-xl hover:bg-black hover:text-white transition-all shadow-sm group-hover:shadow-md"
                                                >
                                                    <ClipboardList className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {orgWarehouses.length === 0 && <div className="py-20 text-center border border-dashed border-zinc-200 rounded-3xl text-zinc-300 font-bold text-xs uppercase">No warehouses registered for this company</div>}
                                    </div>
                                )}
                            </div>
                            {(isAdmin || isStoreManager) && (
                                <div className="p-8 border border-zinc-200 bg-zinc-50/30 rounded-3xl self-start sticky top-0">
                                    <h4 className="text-xs font-bold uppercase tracking-widest mb-8 flex items-center text-zinc-500"><Plus className="w-4 h-4 mr-3 text-black" /> Add Operational Node</h4>
                                    <form onSubmit={handleCreateWarehouse} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Branch Name</label>
                                            <input type="text" placeholder="e.g. Main Distribution Center" required value={whFormData.name} onChange={e => setWhFormData({ ...whFormData, name: e.target.value })} className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm shadow-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Unique Node Code</label>
                                            <input type="text" placeholder="e.g. WH-001" required value={whFormData.code} onChange={e => setWhFormData({ ...whFormData, code: e.target.value })} className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm shadow-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">City / Region</label>
                                            <input type="text" placeholder="e.g. Karachi South" required value={whFormData.location} onChange={e => setWhFormData({ ...whFormData, location: e.target.value })} className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm shadow-sm" />
                                        </div>
                                        <button type="submit" disabled={submitting} className="w-full py-4 bg-black text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all shadow-md disabled:opacity-50">Initialize Warehouse</button>
                                    </form>
                                    {whError && <p className="mt-4 text-xs font-bold text-red-500 text-center uppercase tracking-widest">{whError}</p>}
                                </div>
                            )}
                        </div>
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
                                                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mt-1 font-mono">SKU: {p.sku}</p>
                                                </div>
                                                <span className="text-[10px] font-bold text-zinc-300 uppercase">{p.unit}</span>
                                            </div>
                                        ))}
                                        {orgProducts.length === 0 && <div className="py-20 text-center border border-dashed border-zinc-200 rounded-3xl text-zinc-300 font-bold text-xs uppercase">No products listed</div>}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-6">
                                <div className="p-8 border border-zinc-100 bg-zinc-50 rounded-3xl">
                                    <h4 className="text-xs font-bold uppercase tracking-widest mb-8 flex items-center text-zinc-500"><Plus className="w-4 h-4 mr-3 text-black" /> Add New Item</h4>
                                    <form onSubmit={handleCreateProduct} className="space-y-4">
                                        <input type="text" placeholder="Item Name" required value={prodFormData.name} onChange={e => setProdFormData({ ...prodFormData, name: e.target.value })} className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm shadow-sm" />
                                        <input type="text" placeholder="SKU / Unique Code" required value={prodFormData.sku} onChange={e => setProdFormData({ ...prodFormData, sku: e.target.value })} className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm shadow-sm" />
                                        <button type="submit" disabled={submitting} className="w-full py-4 bg-black text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all shadow-md disabled:opacity-50">Add to Catalog</button>
                                    </form>
                                    {prodError && <p className="mt-4 text-xs font-bold text-red-500 text-center uppercase tracking-widest">{prodError}</p>}
                                </div>

                                <div className="p-8 border border-dashed border-zinc-200 bg-white rounded-3xl">
                                    <h4 className="text-xs font-bold uppercase tracking-widest mb-6 flex items-center text-zinc-500"><FileSpreadsheet className="w-4 h-4 mr-3 text-black" /> Bulk Import</h4>
                                    <p className="text-xs text-zinc-400 mb-6 font-medium">Upload Excel or CSV file with columns: <b>Name, SKU, Category, Unit</b></p>

                                    <input
                                        type="file"
                                        id="bulk-upload"
                                        className="hidden"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleBulkUpload}
                                        disabled={bulkUploading}
                                    />
                                    <label
                                        htmlFor="bulk-upload"
                                        className={`w-full py-4 border-2 border-zinc-100 rounded-xl flex items-center justify-center font-bold text-sm cursor-pointer hover:border-black transition-all ${bulkUploading ? 'opacity-50 cursor-wait' : ''}`}
                                    >
                                        {bulkUploading ? (
                                            <>Processing...</>
                                        ) : (
                                            <><Upload className="w-4 h-4 mr-2" /> Select File</>
                                        )}
                                    </label>

                                    <div className="mt-4 text-center">
                                        <a
                                            href="/templates/product_template.csv"
                                            download
                                            className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors flex items-center justify-center"
                                        >
                                            <FileSpreadsheet className="w-3 h-3 mr-1.5" />
                                            Download Data Template
                                        </a>
                                    </div>

                                    {bulkSummary && (
                                        <div className="mt-6 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-black mb-3">Upload Summary</h5>
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div className="bg-white p-3 rounded-xl border border-zinc-100">
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Success</p>
                                                    <p className="text-lg font-bold text-black">{bulkSummary.success}</p>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-zinc-100">
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Skipped</p>
                                                    <p className="text-lg font-bold text-black">{bulkSummary.skipped}</p>
                                                </div>
                                            </div>
                                            {bulkSummary.errors.length > 0 && (
                                                <div className="mt-2 text-[10px] text-red-500 font-bold max-h-24 overflow-y-auto">
                                                    {bulkSummary.errors.map((err: string, i: number) => (
                                                        <div key={i} className="flex items-start mb-1">
                                                            <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                                            {err}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
