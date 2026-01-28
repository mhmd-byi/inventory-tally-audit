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
    History,
    X,
    Check
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
        } catch (err) { setError('Failed to load companies'); } finally { setLoading(false); }
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
                setSuccess(`Added company: ${formData.name}`);
                setFormData({ name: '', code: '', email: '', phone: '', address: '' });
                fetchOrganizations(); setTimeout(() => setShowCreateModal(false), 2000);
            } else { setError((await res.json()).error); }
        } catch (err) { setError('Error saving company'); } finally { setSubmitting(false); }
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

    if (status === 'loading') return null;

    return (
        <div className="min-h-screen bg-white text-black font-sans">
            <DashboardHeader />

            <main className="max-w-7xl mx-auto px-4 py-10">
                <div className="flex justify-between items-end mb-10 pb-6 border-b border-zinc-200">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">
                            {isAdmin ? 'System Companies' : (isAuditor ? 'Assigned Companies' : 'My Company')}
                        </h2>
                        <p className="text-zinc-500 font-medium text-sm mt-1">
                            Manage organization details and inventory access
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
                                {isAdmin && <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">Warehouses</th>}
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">Inventory</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {organizations.map((org) => (
                                <tr key={org._id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="text-base font-bold text-black">{org.name}</div>
                                        <div className="text-xs font-medium text-zinc-400 mt-0.5">ID: {org.code}</div>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-5 text-right">
                                            <button
                                                onClick={() => { setSelectedOrg(org); fetchWarehouses(org._id); setShowWarehouseModal(true); }}
                                                className="border border-zinc-200 px-4 py-2 hover:border-black rounded-lg text-xs font-bold transition-all"
                                            >
                                                Manage Locations
                                            </button>
                                        </td>
                                    )}
                                    <td className="px-6 py-5 text-right">
                                        <button
                                            onClick={() => { setSelectedOrg(org); fetchProducts(org._id); setShowProductModal(true); }}
                                            className="bg-black text-white px-4 py-2 hover:bg-zinc-800 rounded-lg text-xs font-bold transition-all"
                                        >
                                            {isAuditor ? 'Perform Audit' : 'Manage stock'}
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

            {/* WAREHOUSE MANAGER MODAL */}
            {showWarehouseModal && selectedOrg && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-black">{selectedOrg.name} / Locations</h3>
                                <p className="text-zinc-500 font-medium text-xs mt-1">Manage warehouse branches</p>
                            </div>
                            <button onClick={() => setShowWarehouseModal(false)} className="text-zinc-400 hover:text-black transition-all p-2"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {orgWarehouses.map(wh => (
                                    <div key={wh._id} className="p-4 border border-zinc-200 rounded-2xl hover:border-black transition-all group">
                                        <p className="font-bold text-sm">{wh.name}</p>
                                        <p className="text-xs font-medium text-zinc-400 mt-1 uppercase tracking-wider">Code: {wh.code}</p>
                                    </div>
                                ))}
                                {orgWarehouses.length === 0 && <p className="col-span-2 py-10 text-center text-xs font-medium text-zinc-400 border border-dashed border-zinc-200 rounded-2xl">No warehouses added yet</p>}
                            </div>
                            {isAdmin && (
                                <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                                    <h4 className="text-xs font-bold uppercase tracking-widest mb-6 flex items-center text-zinc-500"><Plus className="w-3 h-3 mr-2 text-black" /> New Warehouse</h4>
                                    <form onSubmit={handleCreateWarehouse} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" placeholder="Name" required value={whFormData.name} onChange={e => setWhFormData({ ...whFormData, name: e.target.value })} className="px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm" />
                                            <input type="text" placeholder="Code" required value={whFormData.code} onChange={e => setWhFormData({ ...whFormData, code: e.target.value })} className="px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm" />
                                        </div>
                                        <button type="submit" className="w-full py-4 bg-black text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all shadow-sm">Add Location</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PRODUCT MANAGER MODAL */}
            {showProductModal && selectedOrg && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-black">{selectedOrg.name} / Products</h3>
                                <p className="text-zinc-500 font-medium text-xs mt-1">Manage product catalog and inventory</p>
                            </div>
                            <button onClick={() => setShowProductModal(false)} className="text-zinc-400 hover:text-black transition-all p-2"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center"><Package className="w-4 h-4 mr-3 text-black" /> Product Catalog</h4>
                                {prodLoading ? <div className="p-10 text-center font-medium text-zinc-400">Loading catalog...</div> : (
                                    <div className="space-y-3">
                                        {orgProducts.map(p => (
                                            <div key={p._id} className="p-5 border border-zinc-100 bg-zinc-50/30 rounded-2xl flex justify-between items-center group hover:border-zinc-300 transition-all">
                                                <div>
                                                    <p className="font-bold text-sm">{p.name}</p>
                                                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mt-1">SKU: {p.sku}</p>
                                                </div>
                                                <button
                                                    onClick={() => openStockManagement(p)}
                                                    className="bg-white border border-zinc-200 px-4 py-2 hover:border-black rounded-lg text-xs font-bold transition-all"
                                                >
                                                    {isAuditor ? 'Check' : 'Audit'}
                                                </button>
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
                                        <button type="submit" className="w-full py-4 bg-black text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all shadow-md">Save Item</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* STOCK MANAGEMENT MODAL */}
            {showStockModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-[2rem] max-w-6xl w-full p-10 relative flex flex-col max-h-[95vh] shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-start mb-10 shrink-0 border-b border-zinc-100 pb-8">
                            <div>
                                <span className="text-[10px] font-bold tracking-widest uppercase bg-zinc-100 text-zinc-500 px-3 py-1 rounded-full mb-4 inline-block">
                                    {isAuditor ? 'Field Audit Count' : 'Inventory Stock Check'}
                                </span>
                                <h3 className="text-4xl font-bold text-black tracking-tight">{selectedProduct.name}</h3>
                                <p className="text-zinc-500 font-medium text-sm mt-2">{selectedOrg?.name} - Product Details</p>
                            </div>
                            <button onClick={() => setShowStockModal(false)} className="text-zinc-300 hover:text-black transition-all p-2"><X className="w-8 h-8" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-4 grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-10">
                                <div className="border border-zinc-100 bg-zinc-50 p-8 rounded-3xl">
                                    <h4 className="text-xs font-bold uppercase tracking-widest mb-8 flex items-center text-zinc-500"><Plus className="w-4 h-4 mr-3 text-black" /> {isAuditor ? 'Physical Entry' : 'Update Stock'}</h4>
                                    <form onSubmit={handleUpdateStock} className="space-y-5">
                                        <select
                                            required value={stockFormData.warehouseId}
                                            onChange={e => setStockFormData({ ...stockFormData, warehouseId: e.target.value })}
                                            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-bold text-sm appearance-none shadow-sm"
                                        >
                                            <option value="">Select Warehouse Branch...</option>
                                            {orgWarehouses.map(w => <option key={w._id} value={w._id}>{w.name} ({w.code})</option>)}
                                        </select>
                                        <div className="relative">
                                            <input
                                                type="number" required placeholder="Count Value" value={stockFormData.quantity}
                                                onChange={e => setStockFormData({ ...stockFormData, quantity: Number(e.target.value) })}
                                                className="w-full px-4 py-4 border border-zinc-200 rounded-xl focus:border-black outline-none font-bold text-3xl tracking-tight shadow-sm"
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-300 font-bold uppercase tracking-widest text-xs">{selectedProduct.unit}</span>
                                        </div>
                                        <textarea
                                            placeholder="Notes (Optional)"
                                            value={stockFormData.notes}
                                            onChange={e => setStockFormData({ ...stockFormData, notes: e.target.value })}
                                            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm resize-none h-24"
                                        />
                                        {!isAuditor && (
                                            <div className="flex border border-zinc-200 p-1 rounded-xl bg-white">
                                                <button type="button" onClick={() => setStockFormData({ ...stockFormData, type: 'set' })} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg ${stockFormData.type === 'set' ? 'bg-black text-white' : 'text-zinc-400 hover:text-black'}`}>Exact Count</button>
                                                <button type="button" onClick={() => setStockFormData({ ...stockFormData, type: 'adjust' })} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg ${stockFormData.type === 'adjust' ? 'bg-black text-white' : 'text-zinc-400 hover:text-black'}`}>Adjust +/-</button>
                                            </div>
                                        )}
                                        <button type="submit" disabled={submitting} className="w-full py-4 bg-black text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all shadow-md">Submit Audit</button>
                                    </form>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center"><History className="w-4 h-4 mr-3 text-black" /> Previous Counts</h4>
                                    <div className="space-y-3">
                                        {auditHistory.length === 0 ? <div className="py-12 border border-dashed border-zinc-200 rounded-3xl text-center font-bold text-xs uppercase text-zinc-300">No previous records</div> : auditHistory.map(a => (
                                            <div key={a._id} className="p-4 border border-zinc-100 rounded-2xl flex justify-between items-center group hover:border-zinc-300 transition-all bg-zinc-50/50">
                                                <div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-[10px] font-bold bg-white border border-zinc-200 px-2 py-0.5 rounded-lg text-black">{a.auditor?.name}</span>
                                                        <span className="text-[10px] font-medium text-zinc-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-xs font-medium text-zinc-500 mt-2">"{a.notes || 'No notes'}"</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-lg font-bold ${a.discrepancy === 0 ? 'text-black' : (a.discrepancy > 0 ? 'text-black' : 'text-red-500')}`}>
                                                        {a.discrepancy > 0 ? `+${a.discrepancy}` : a.discrepancy}
                                                    </div>
                                                    <div className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Variance</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center border-l-2 border-black pl-3">Live Stock Snapshot</h4>
                                <div className="space-y-4">
                                    {productStocks.map(s => (
                                        <div key={s._id} className="relative p-8 border border-zinc-200 rounded-3xl hover:border-black transition-all bg-white shadow-sm overflow-hidden group">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-xl leading-none">{s.warehouse?.name}</p>
                                                    <div className="flex items-center space-x-3 mt-3">
                                                        <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-md uppercase tracking-wider">{s.warehouse?.code}</span>
                                                        {s.lastAuditDate && <span className="text-[10px] font-medium text-zinc-300">Updated: {new Date(s.lastAuditDate).toLocaleDateString()}</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-6xl font-bold tracking-tight leading-none">{s.quantity}</div>
                                                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">{selectedProduct.unit} available</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {productStocks.length === 0 && <div className="py-20 text-center border border-dashed border-zinc-200 rounded-3xl font-bold text-xs uppercase text-zinc-300">No system stock found</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
