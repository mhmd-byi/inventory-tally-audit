'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import {
    Building2,
    Warehouse,
    Package,
    ChevronRight,
    Plus,
    History,
    Activity,
    Search,
    Trash2,
    CheckCircle2,
    X,
    ClipboardCheck,
    Navigation,
    Info
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

interface WarehouseData {
    _id: string;
    name: string;
    code: string;
    location?: string;
    status: string;
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
    const [showWarehouseModal, setShowWarehouseModal] = useState(false);
    const [orgWarehouses, setOrgWarehouses] = useState<WarehouseData[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [orgProducts, setOrgProducts] = useState<Product[]>([]);
    const [prodLoading, setProdLoading] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [productStocks, setProductStocks] = useState<any[]>([]);
    const [auditHistory, setAuditHistory] = useState<any[]>([]);

    const [formData, setFormData] = useState({ name: '', code: '', email: '', phone: '', address: '' });
    const [whFormData, setWhFormData] = useState({ name: '', code: '', location: '' });
    const [prodFormData, setProdFormData] = useState({ name: '', sku: '', category: '', unit: 'pcs', description: '' });
    const [stockFormData, setStockFormData] = useState({ warehouseId: '', quantity: 0, type: 'set', notes: '' });

    const [error, setError] = useState('');
    const [prodError, setProdError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isAdmin = session?.user?.role === 'admin';
    const isStoreManager = session?.user?.role === 'store_manager';
    const isAuditor = session?.user?.role === 'auditor';

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
        } catch (err) { setError('Failed to load organizations'); } finally { setLoading(false); }
    };

    const fetchWarehouses = async (orgId: string) => {
        try {
            const response = await fetch(`/api/warehouses?organizationId=${orgId}`);
            if (response.ok) setOrgWarehouses(await response.json());
        } catch (err) { }
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
                setSuccess(`Created ${formData.name}`);
                setFormData({ name: '', code: '', email: '', phone: '', address: '' });
                fetchOrganizations(); setTimeout(() => setShowCreateModal(false), 2000);
            } else { setError((await res.json()).error); }
        } catch (err) { setError('Error'); } finally { setSubmitting(false); }
    };

    const handleCreateWarehouse = async (e: React.FormEvent) => {
        e.preventDefault(); if (!selectedOrg) return; setSubmitting(true);
        try {
            const res = await fetch('/api/warehouses', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...whFormData, organization: selectedOrg._id }),
            });
            if (res.ok) { setWhFormData({ name: '', code: '', location: '' }); fetchWarehouses(selectedOrg._id); }
        } catch (err) { } finally { setSubmitting(false); }
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

    const openStockManagement = async (product: Product) => {
        setSelectedProduct(product); setShowStockModal(true); refreshStockData(product._id);
        if (selectedOrg) fetchWarehouses(selectedOrg._id);
    };

    const refreshStockData = async (productId: string) => {
        try {
            const res = await fetch(`/api/inventory?productId=${productId}`);
            if (res.ok) setProductStocks(await res.json());
            const auditRes = await fetch(`/api/inventory?productId=${productId}&warehouseId=${stockFormData.warehouseId || ''}&includeAudits=true`);
            if (auditRes.ok) { const aData = await auditRes.json(); setAuditHistory(aData.audits || []); }
        } catch (e) { }
    };

    useEffect(() => {
        if (showStockModal && selectedProduct && stockFormData.warehouseId) {
            const fetchTargetAudits = async () => {
                const res = await fetch(`/api/inventory?productId=${selectedProduct._id}&warehouseId=${stockFormData.warehouseId}&includeAudits=true`);
                if (res.ok) { const data = await res.json(); setAuditHistory(data.audits || []); }
            };
            fetchTargetAudits();
        }
    }, [stockFormData.warehouseId]);

    const handleUpdateStock = async (e: React.FormEvent) => {
        e.preventDefault(); if (!selectedProduct) return; setSubmitting(true);
        try {
            const res = await fetch('/api/inventory', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: selectedProduct._id, ...stockFormData })
            });
            if (res.ok) { refreshStockData(selectedProduct._id); setStockFormData({ warehouseId: '', quantity: 0, type: 'set', notes: '' }); }
        } catch (e) { } finally { setSubmitting(false); }
    };

    if (status === 'loading') return <div className="p-8 font-black uppercase tracking-widest text-xs">Accessing Hub Records...</div>;

    return (
        <div className="min-h-screen bg-white text-black">
            <DashboardHeader />

            <main className="max-w-7xl mx-auto px-4 py-12">
                <div className="flex justify-between items-end mb-12 border-b-4 border-black pb-8">
                    <div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter">
                            {isAdmin ? 'System / Hubs' : (isAuditor ? 'Assigned / Hubs' : 'Org Hub')}
                        </h2>
                        <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-2">
                            Network Entity Registry
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-black text-white px-8 py-4 font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all flex items-center"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Hub
                        </button>
                    )}
                </div>

                <div className="border-4 border-black overflow-hidden bg-white">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-black text-white">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Hub Identity</th>
                                {isAdmin && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-right">Operational Network</th>}
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-right">Audit Scope</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-zinc-100">
                            {organizations.map((org) => (
                                <tr key={org._id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-6 py-6 text-black">
                                        <div className="text-lg font-black uppercase tracking-tighter">{org.name}</div>
                                        <div className="text-[10px] font-mono font-bold text-zinc-400 mt-1">ID_{org.code}</div>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-6 text-right">
                                            <button
                                                onClick={() => { setSelectedOrg(org); fetchWarehouses(org._id); setShowWarehouseModal(true); }}
                                                className="border-2 border-zinc-200 px-4 py-2 hover:border-black transition-all text-[10px] font-black uppercase tracking-widest"
                                            >
                                                Locations
                                            </button>
                                        </td>
                                    )}
                                    <td className="px-6 py-6 text-right">
                                        <button
                                            onClick={() => { setSelectedOrg(org); fetchProducts(org._id); setShowProductModal(true); }}
                                            className="bg-black text-white px-4 py-2 hover:bg-zinc-800 transition-all text-[10px] font-black uppercase tracking-widest"
                                        >
                                            {isAuditor ? 'Launch Audit' : 'Inventory'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Organizations Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black max-w-md w-full p-10">
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 border-b-2 border-black pb-4">New Hub Identity</h3>
                        <form onSubmit={handleCreateOrganization} className="space-y-6">
                            <input type="text" placeholder="ORG_NAME" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-xs uppercase" />
                            <input type="text" placeholder="ORG_CODE" required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-xs uppercase" />
                            <div className="flex space-x-4 pt-6">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 font-black text-xs uppercase tracking-widest border-2 border-zinc-100 py-4 hover:border-black transition-all">Cancel</button>
                                <button type="submit" className="flex-1 bg-black text-white py-4 font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all">Register Hub</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* WAREHOUSE MANAGER MODAL */}
            {showWarehouseModal && selectedOrg && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-10 border-b-2 border-black flex justify-between items-center bg-zinc-50">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter">{selectedOrg.name} / Hubs</h3>
                                <p className="text-zinc-500 font-bold text-[10px] uppercase mt-1 tracking-widest">Network Location Mapping</p>
                            </div>
                            <button onClick={() => setShowWarehouseModal(false)} className="text-black hover:opacity-50 transition-all"><X className="w-8 h-8" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {orgWarehouses.map(wh => (
                                    <div key={wh._id} className="p-6 border-2 border-zinc-100 flex justify-between items-center group hover:border-black transition-all">
                                        <div>
                                            <p className="font-black uppercase text-sm tracking-tight">{wh.name}</p>
                                            <p className="text-[9px] font-bold text-zinc-400 tracking-widest uppercase mt-1">CODE_{wh.code}</p>
                                        </div>
                                    </div>
                                ))}
                                {orgWarehouses.length === 0 && <p className="col-span-2 py-12 text-center text-[10px] font-black uppercase text-zinc-300 border-2 border-dashed border-zinc-100">No hubs mapped</p>}
                            </div>
                            {isAdmin && (
                                <div className="border-4 border-black p-8">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 flex items-center"><Plus className="w-3 h-3 mr-2" />Provision Area</h4>
                                    <form onSubmit={handleCreateWarehouse} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" placeholder="AREA_NAME" required value={whFormData.name} onChange={e => setWhFormData({ ...whFormData, name: e.target.value })} className="px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-xs uppercase" />
                                            <input type="text" placeholder="HUB_CODE" required value={whFormData.code} onChange={e => setWhFormData({ ...whFormData, code: e.target.value })} className="px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-xs uppercase" />
                                        </div>
                                        <button type="submit" className="w-full py-5 bg-black text-white font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all">Map Area</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PRODUCT MANAGER MODAL */}
            {showProductModal && selectedOrg && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-10 border-b-2 border-black flex justify-between items-center bg-zinc-50">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter">{selectedOrg.name} / Assets</h3>
                                <p className="text-zinc-500 font-bold text-[10px] uppercase mt-1 tracking-widest">Audit Registry Catalog</p>
                            </div>
                            <button onClick={() => setShowProductModal(false)} className="text-black hover:opacity-50 transition-all"><X className="w-8 h-8" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center"><Package className="w-4 h-4 mr-3" /> Asset Registry</h4>
                                {prodLoading ? <div className="p-10 text-center font-black uppercase italic text-zinc-300">Syncing...</div> : (
                                    <div className="space-y-3">
                                        {orgProducts.map(p => (
                                            <div key={p._id} className="p-6 border-2 border-zinc-100 flex justify-between items-center hover:border-black transition-all group">
                                                <div>
                                                    <p className="font-black uppercase tracking-tight text-sm">{p.name}</p>
                                                    <p className="text-[9px] font-black text-zinc-400 tracking-[0.2em] uppercase mt-1">SKU_{p.sku}</p>
                                                </div>
                                                <button
                                                    onClick={() => openStockManagement(p)}
                                                    className="border-2 border-zinc-100 px-4 py-2 hover:bg-black hover:text-white hover:border-black transition-all text-[9px] font-black uppercase tracking-widest"
                                                >
                                                    {isAuditor ? 'Check' : 'Audit'}
                                                </button>
                                            </div>
                                        ))}
                                        {orgProducts.length === 0 && <div className="py-20 text-center border-2 border-dashed border-zinc-100 text-zinc-300 font-black text-[10px] uppercase tracking-widest">No assets found</div>}
                                    </div>
                                )}
                            </div>
                            {(isAdmin || isStoreManager) && (
                                <div className="border-4 border-black p-10 self-start sticky top-0">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 flex items-center"><Plus className="w-4 h-4 mr-3" /> Add Asset</h4>
                                    <form onSubmit={handleCreateProduct} className="space-y-6">
                                        <input type="text" placeholder="DISP_NAME" required value={prodFormData.name} onChange={e => setProdFormData({ ...prodFormData, name: e.target.value })} className="w-full px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-xs uppercase" />
                                        <input type="text" placeholder="ASSET_SKU" required value={prodFormData.sku} onChange={e => setProdFormData({ ...prodFormData, sku: e.target.value })} className="w-full px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-xs uppercase" />
                                        <button type="submit" className="w-full py-5 bg-black text-white font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all">Publish Asset</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* STOCK MANAGEMENT MODAL */}
            {showStockModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-white border-4 border-black max-w-6xl w-full p-12 relative overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="flex justify-between items-start mb-12 shrink-0 border-b-2 border-black pb-8">
                            <div>
                                <span className="text-[10px] font-black tracking-[0.3em] uppercase bg-black text-white px-3 py-1 mb-4 inline-block">
                                    {isAuditor ? 'Field Discovery / Audit' : 'Terminal / Command Unit'}
                                </span>
                                <h3 className="text-5xl font-black uppercase tracking-tighter">{selectedProduct.name}</h3>
                                <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Operational Node Registry / {selectedOrg?.name}</p>
                            </div>
                            <button onClick={() => setShowStockModal(false)} className="text-black hover:opacity-50 transition-all"><X className="w-10 h-10" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-6 grid grid-cols-1 lg:grid-cols-2 gap-16">
                            <div className="space-y-12">
                                <div className="border-4 border-black p-10">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 flex items-center"><Plus className="w-4 h-4 mr-3" /> {isAuditor ? 'Physical Entry' : 'Manual Sync'}</h4>
                                    <form onSubmit={handleUpdateStock} className="space-y-6">
                                        <select
                                            required value={stockFormData.warehouseId}
                                            onChange={e => setStockFormData({ ...stockFormData, warehouseId: e.target.value })}
                                            className="w-full px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-xs uppercase appearance-none"
                                        >
                                            <option value="">Select Target Hub...</option>
                                            {orgWarehouses.map(w => <option key={w._id} value={w._id}>{w.name} ({w.code})</option>)}
                                        </select>
                                        <div className="relative">
                                            <input
                                                type="number" required placeholder="COUNT_VALUE" value={stockFormData.quantity}
                                                onChange={e => setStockFormData({ ...stockFormData, quantity: Number(e.target.value) })}
                                                className="w-full px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-4xl tracking-tighter shadow-sm"
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-300 font-black uppercase tracking-[0.2em] text-[10px]">{selectedProduct.unit}</span>
                                        </div>
                                        <textarea
                                            placeholder="FIELD_NOTES (OPTIONAL)"
                                            value={stockFormData.notes}
                                            onChange={e => setStockFormData({ ...stockFormData, notes: e.target.value })}
                                            className="w-full px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-bold text-xs uppercase resize-none h-32"
                                        />
                                        {!isAuditor && (
                                            <div className="flex border-2 border-black p-1">
                                                <button type="button" onClick={() => setStockFormData({ ...stockFormData, type: 'set' })} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${stockFormData.type === 'set' ? 'bg-black text-white' : 'text-zinc-400'}`}>Absolute</button>
                                                <button type="button" onClick={() => setStockFormData({ ...stockFormData, type: 'adjust' })} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${stockFormData.type === 'adjust' ? 'bg-black text-white' : 'text-zinc-400'}`}>Adj +/-</button>
                                            </div>
                                        )}
                                        <button type="submit" disabled={submitting} className="w-full py-6 bg-black text-white font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all">Submit Entry</button>
                                    </form>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center"><History className="w-4 h-4 mr-3" /> Discovery History</h4>
                                    <div className="space-y-4">
                                        {auditHistory.length === 0 ? <div className="p-16 border-2 border-dashed border-zinc-100 text-center font-black text-[10px] uppercase text-zinc-300">No logs on record</div> : auditHistory.map(a => (
                                            <div key={a._id} className="p-6 border-2 border-zinc-100 flex justify-between items-center group hover:border-black transition-all">
                                                <div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-[9px] font-black bg-zinc-100 px-2 py-0.5 uppercase">{a.auditor?.name}</span>
                                                        <span className="text-[9px] font-bold text-zinc-300 uppercase">{new Date(a.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-[10px] font-black text-zinc-500 mt-2 uppercase italic">"{a.notes || 'CLEAR'}"</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-black">{a.discrepancy > 0 ? `+${a.discrepancy}` : a.discrepancy}</div>
                                                    <div className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Variation</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-10">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] border-l-4 border-black pl-4">System Snapshot</h4>
                                <div className="space-y-6">
                                    {productStocks.map(s => (
                                        <div key={s._id} className="relative p-10 border-2 border-zinc-100 hover:border-black transition-all overflow-hidden group bg-white shadow-sm">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-black text-3xl uppercase tracking-tighter leading-none">{s.warehouse?.name}</p>
                                                    <div className="flex items-center space-x-4 mt-3">
                                                        <span className="text-[9px] font-black bg-black text-white px-2.5 py-1 uppercase tracking-widest">{s.warehouse?.code}</span>
                                                        {s.lastAuditDate && <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Ref_{new Date(s.lastAuditDate).toLocaleDateString()}</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-7xl font-black tracking-tighter leading-none">{s.quantity}</div>
                                                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-3 underline underline-offset-4">{selectedProduct.unit} / Unit</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {productStocks.length === 0 && <div className="py-24 text-center border-2 border-dashed border-zinc-100 font-black text-[10px] uppercase text-zinc-200">Zero System Units</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
