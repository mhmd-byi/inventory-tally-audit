'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import {
    Warehouse as WarehouseIcon,
    ArrowLeft,
    Save,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Package,
    History
} from 'lucide-react';

interface Product {
    _id: string;
    name: string;
    sku: string;
    unit: string;
}

interface InventoryItem {
    product: Product;
    quantity: number;
    lastAuditDate: string | null;
    lastAuditValue: number | null;
    stockId: string | null;
}

interface WarehouseDetails {
    _id: string;
    name: string;
    code: string;
    organization: {
        name: string;
    };
}

export default function WarehouseAuditPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const warehouseId = params.id as string;

    const [warehouse, setWarehouse] = useState<WarehouseDetails | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saveStatus, setSaveStatus] = useState<{ [key: string]: 'idle' | 'saving' | 'success' | 'error' }>({});

    // Local state for inputs
    const [inputs, setInputs] = useState<{ [productId: string]: { systemVal: string, auditVal: string } }>({});

    const isStoreManager = session?.user?.role === 'store_manager' || session?.user?.role === 'admin';
    const isAuditor = session?.user?.role === 'auditor' || session?.user?.role === 'admin';

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchData();
        }
    }, [status, warehouseId, router]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError('');

            // 1. Fetch Warehouse
            const whRes = await fetch(`/api/warehouses/${warehouseId}`);
            if (!whRes.ok) throw new Error('Warehouse not found');
            const whData = await whRes.json();
            setWarehouse(whData);

            // 2. Fetch Full Inventory List
            const invRes = await fetch(`/api/inventory?warehouseId=${warehouseId}&getFullList=true`);
            if (!invRes.ok) throw new Error('Failed to load products');
            const invData: InventoryItem[] = await invRes.json();
            setInventory(invData);

            // Initialize inputs
            const initialInputs: any = {};
            invData.forEach(item => {
                initialInputs[item.product._id] = {
                    systemVal: item.quantity.toString(),
                    auditVal: item.lastAuditValue !== null ? item.lastAuditValue.toString() : ''
                };
            });
            setInputs(initialInputs);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (productId: string, type: 'system' | 'audit', value: string) => {
        setInputs(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [type === 'system' ? 'systemVal' : 'auditVal']: value
            }
        }));
    };

    const handleSave = async (productId: string, role: 'store_manager' | 'auditor') => {
        const val = role === 'store_manager' ? inputs[productId].systemVal : inputs[productId].auditVal;

        if (val === '' && role === 'auditor') return; // Audit value can't be empty if saving as auditor

        setSaveStatus(prev => ({ ...prev, [productId]: 'saving' }));

        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    warehouseId,
                    quantity: Number(val),
                    type: role === 'store_manager' ? 'set' : 'audit' // Backend handles logic based on role session
                })
            });

            if (res.ok) {
                setSaveStatus(prev => ({ ...prev, [productId]: 'success' }));
                setTimeout(() => {
                    setSaveStatus(prev => ({ ...prev, [productId]: 'idle' }));
                    if (role === 'store_manager') {
                        // Update the baseline quantity in UI if manager saved
                        setInventory(prev => prev.map(item =>
                            item.product._id === productId ? { ...item, quantity: Number(val) } : item
                        ));
                    }
                }, 2000);
            } else {
                setSaveStatus(prev => ({ ...prev, [productId]: 'error' }));
            }
        } catch (e) {
            setSaveStatus(prev => ({ ...prev, [productId]: 'error' }));
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
    );

    if (error || !warehouse) return (
        <div className="min-h-screen bg-white p-10">
            <div className="max-w-7xl mx-auto border border-red-100 bg-red-50 p-6 rounded-2xl flex items-center text-red-700">
                <AlertCircle className="w-6 h-6 mr-4" />
                <span className="font-bold">{error || 'Warehouse not found'}</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white text-black font-sans">
            <DashboardHeader />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="mb-8 overflow-hidden">
                    <button
                        onClick={() => router.push('/dashboard/warehouses')}
                        className="flex items-center text-zinc-400 hover:text-black transition-colors mb-6 font-bold text-sm group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Warehouses
                    </button>

                    <div className="flex justify-between items-end pb-6 border-b border-zinc-100">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded">
                                    {warehouse.code}
                                </span>
                                <span className="text-zinc-400 font-medium text-xs uppercase tracking-wider">
                                    {warehouse.organization.name}
                                </span>
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight text-black">{warehouse.name}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Current User Role</p>
                            <p className="text-sm font-bold text-black uppercase tracking-tight italic">
                                {session?.user?.role?.replace('_', ' ')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Table Section */}
                <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200">
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Item Details</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Baseline Stock</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center w-48">Store Manager / Update</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center w-48">Auditor / Physical Count</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right w-24">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {inventory.map((item) => (
                                <tr key={item.product._id} className="hover:bg-zinc-50/50 transition-colors group">
                                    <td className="px-6 py-6">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center font-bold text-black mr-4 uppercase text-xs border border-zinc-200 group-hover:bg-white transition-colors">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-black">{item.product.name}</div>
                                                <div className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-tight">SKU: {item.product.sku}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="text-xl font-bold text-black">{item.quantity}</div>
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{item.product.unit} available</div>
                                    </td>

                                    {/* Store Manager Column */}
                                    <td className="px-6 py-6 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <input
                                                type="number"
                                                disabled={!isStoreManager}
                                                value={inputs[item.product._id]?.systemVal || ''}
                                                onChange={(e) => handleInputChange(item.product._id, 'system', e.target.value)}
                                                className={`w-24 px-3 py-2 border rounded-lg font-bold text-sm focus:ring-2 focus:ring-black outline-none text-center transition-all ${isStoreManager ? 'bg-white border-zinc-200 focus:border-black' : 'bg-zinc-100 border-transparent text-zinc-400 cursor-not-allowed'
                                                    }`}
                                                placeholder="Qty"
                                            />
                                            {isStoreManager && (
                                                <button
                                                    onClick={() => handleSave(item.product._id, 'store_manager')}
                                                    className="p-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
                                                    disabled={saveStatus[item.product._id] === 'saving'}
                                                >
                                                    <Save className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    {/* Auditor Column */}
                                    <td className="px-6 py-6 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <input
                                                type="number"
                                                disabled={!isAuditor}
                                                value={inputs[item.product._id]?.auditVal || ''}
                                                onChange={(e) => handleInputChange(item.product._id, 'audit', e.target.value)}
                                                className={`w-24 px-3 py-2 border rounded-lg font-bold text-sm focus:ring-2 focus:ring-black outline-none text-center transition-all ${isAuditor ? 'bg-white border-zinc-200 focus:border-black' : 'bg-zinc-100 border-transparent text-zinc-400 cursor-not-allowed'
                                                    }`}
                                                placeholder="Count"
                                            />
                                            {isAuditor && (
                                                <button
                                                    onClick={() => handleSave(item.product._id, 'auditor')}
                                                    className="p-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
                                                    disabled={saveStatus[item.product._id] === 'saving' || inputs[item.product._id]?.auditVal === ''}
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-6 text-right">
                                        {/* SAVE STATUS FEEDBACK */}
                                        {saveStatus[item.product._id] === 'saving' && (
                                            <div className="flex items-center justify-end">
                                                <Loader2 className="w-4 h-4 animate-spin text-zinc-300" />
                                            </div>
                                        )}
                                        {saveStatus[item.product._id] === 'success' && (
                                            <div className="text-[10px] font-black text-black flex items-center justify-end uppercase tracking-widest animate-pulse mb-1">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Updated
                                            </div>
                                        )}
                                        {saveStatus[item.product._id] === 'error' && (
                                            <div className="text-[10px] font-black text-red-500 flex items-center justify-end uppercase tracking-widest mb-1">
                                                <AlertCircle className="w-3 h-3 mr-1" /> Sync Error
                                            </div>
                                        )}

                                        {/* DISCREPANCY DISPLAY */}
                                        {inputs[item.product._id]?.auditVal !== '' ? (() => {
                                            const diff = Number(inputs[item.product._id].auditVal) - item.quantity;
                                            return diff === 0 ? (
                                                <div className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 border border-green-100 rounded-md text-[10px] font-black uppercase tracking-wider">
                                                    <CheckCircle2 className="w-3 h-3 mr-1.5" /> Match
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 border border-red-100 rounded-md text-[10px] font-black uppercase tracking-wider">
                                                    <AlertCircle className="w-3 h-3 mr-1.5" /> {diff > 0 ? `+${diff}` : diff} Variance
                                                </div>
                                            );
                                        })() : item.lastAuditDate ? (
                                            <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest text-right">
                                                Last: {new Date(item.lastAuditDate).toLocaleDateString()}
                                            </div>
                                        ) : (
                                            <div className="text-[9px] font-bold text-zinc-200 uppercase tracking-widest text-right">
                                                No Audit Yet
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {inventory.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-zinc-100 rounded-[2.5rem] mt-8">
                        <Package className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                        <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">No products in this company catalog</p>
                    </div>
                )}
            </main>
        </div>
    );
}
