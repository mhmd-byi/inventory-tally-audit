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
    History,
    Plus,
    Upload,
    FileSpreadsheet,
    X,
    FileText,
    Search,
    ClipboardCheck
} from 'lucide-react';

interface Product {
    _id: string;
    name: string;
    sku: string;
    unit: string;
    bookStock?: number;
    bookStockValue?: number;
}

interface InventoryItem {
    product: Product;
    quantity: number;
    bookStock: number;
    bookStockValue: number;
    lastAuditDate: string | null;
    lastAuditValue: number | null;
    stockId: string | null;
}

interface WarehouseDetails {
    _id: string;
    name: string;
    code: string;
    auditStatus?: 'not_started' | 'in_progress' | 'completed';
    organization: {
        _id: string;
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
    const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saveStatus, setSaveStatus] = useState<{ [key: string]: 'idle' | 'saving' | 'success' | 'error' }>({});

    // Product Modal States
    const [showProductModal, setShowProductModal] = useState(false);
    const [prodFormData, setProdFormData] = useState({ name: '', sku: '', category: '', unit: 'pcs', description: '', bookStock: '', bookStockValue: '' });
    const [prodError, setProdError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkSummary, setBulkSummary] = useState<any>(null);

    // Local state for inputs
    const [inputs, setInputs] = useState<{ [productId: string]: { systemVal: string, auditVal: string, bookStockVal: string, bookStockValue: string } }>({});

    // Checklist states
    const [showChecklistModal, setShowChecklistModal] = useState(false);
    const [checklistTemplate, setChecklistTemplate] = useState<any>(null);
    const [checklistResponses, setChecklistResponses] = useState<any>({});
    const [checklistStatus, setChecklistStatus] = useState<'idle' | 'loading' | 'saving'>('idle');

    const isAdmin = session?.user?.role === 'admin';
    const isStoreManager = session?.user?.role === 'store_manager' || session?.user?.role === 'admin';
    const isAuditor = session?.user?.role === 'auditor' || session?.user?.role === 'lead_auditor' || session?.user?.role === 'admin';
    const isLeadAuditor = session?.user?.role === 'lead_auditor' || session?.user?.role === 'admin';

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim() === '') {
                setFilteredInventory(inventory);
            } else {
                const filtered = inventory.filter(item =>
                    item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.product.sku.toLowerCase().includes(searchQuery.toLowerCase())
                );
                setFilteredInventory(filtered);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, inventory]);


    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setProdError('');
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...prodFormData,
                    warehouseId,
                    bookStock: Number(prodFormData.bookStock) || 0,
                    bookStockValue: Number(prodFormData.bookStockValue) || 0
                }),
            });
            if (res.ok) {
                setProdFormData({ name: '', sku: '', category: '', unit: 'pcs', description: '', bookStock: '', bookStockValue: '' });
                setShowProductModal(false);
                fetchData();
            } else {
                setProdError((await res.json()).error);
            }
        } catch (err) {
            setProdError('Failed to create product');
        } finally {
            setSubmitting(false);
        }
    };

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setBulkUploading(true);
        setProdError('');
        setBulkSummary(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('warehouseId', warehouseId);

        try {
            const res = await fetch('/api/products/bulk', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                setBulkSummary(data.summary);
                fetchData();
            } else {
                setProdError(data.error);
            }
        } catch (err) {
            setProdError('Failed to upload file');
        } finally {
            setBulkUploading(false);
            e.target.value = '';
        }
    };

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
                    auditVal: item.lastAuditValue !== null ? item.lastAuditValue.toString() : '',
                    bookStockVal: item.bookStock !== undefined ? item.bookStock.toString() : (item.product.bookStock || 0).toString(),
                    bookStockValue: item.bookStockValue !== undefined ? item.bookStockValue.toString() : (item.product.bookStockValue || 0).toString()
                };
            });
            setInputs(initialInputs);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAuditControl = async (action: 'initiate' | 'close' | 'reset') => {
        if (!confirm(`Are you sure you want to ${action === 'initiate' ? 'start the audit' : action === 'close' ? 'finalize and close the audit' : 'reset the audit status'}?`)) return;

        try {
            setSubmitting(true);
            const res = await fetch(`/api/warehouses/${warehouseId}/audit-control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });

            if (res.ok) {
                alert(`Audit ${action === 'initiate' ? 'started' : action === 'close' ? 'closed' : 'reset'} successfully!`);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update audit status');
            }
        } catch (err) {
            alert('Error updating audit status');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (productId: string, type: 'system' | 'audit' | 'bookStock' | 'bookStockValue', value: string) => {
        setInputs(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [type === 'system' ? 'systemVal' : type === 'audit' ? 'auditVal' : (type === 'bookStock' ? 'bookStockVal' : 'bookStockValue')]: value
            }
        }));
    };

    const handleSave = async (productId: string, target: 'system' | 'audit' | 'bookStock' | 'bookStockValue') => {
        const val = target === 'system'
            ? inputs[productId].systemVal
            : target === 'audit'
                ? inputs[productId].auditVal
                : target === 'bookStock'
                    ? inputs[productId].bookStockVal
                    : inputs[productId].bookStockValue;

        if (val === '' && target === 'audit') return; // Audit value can't be empty if saving as auditor

        setSaveStatus(prev => ({ ...prev, [productId]: 'saving' }));

        try {
            const body: any = {
                productId,
                warehouseId,
                type: target === 'system' ? 'set' : (target === 'audit' ? 'audit' : (target === 'bookStock' ? 'bookUpdate' : 'bookValueUpdate'))
            };

            if (target === 'bookStock') {
                body.bookStock = Number(val);
            } else if (target === 'bookStockValue') {
                body.bookStockValue = Number(val);
            } else {
                body.quantity = Number(val);
            }

            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setSaveStatus(prev => ({ ...prev, [productId]: 'success' }));
                setTimeout(() => {
                    setSaveStatus(prev => ({ ...prev, [productId]: 'idle' }));
                    if (target === 'system') {
                        // Update the baseline quantity in UI if manager saved
                        setInventory(prev => prev.map(item =>
                            item.product._id === productId ? { ...item, quantity: Number(val) } : item
                        ));
                    } else if (target === 'bookStock') {
                        setInventory(prev => prev.map(item =>
                            item.product._id === productId ? { ...item, bookStock: Number(val) } : item
                        ));
                    } else if (target === 'bookStockValue') {
                        setInventory(prev => prev.map(item =>
                            item.product._id === productId ? { ...item, bookStockValue: Number(val) } : item
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

    const fetchChecklist = async () => {
        if (!warehouse?._id) return;
        try {
            setChecklistStatus('loading');
            // Fetch template
            const templateRes = await fetch('/api/checklists');
            if (templateRes.ok) {
                const template = await templateRes.json();
                setChecklistTemplate(template);

                // Initialize responses
                const initialResponses: any = {};
                template.items?.forEach((item: any) => {
                    initialResponses[item._id] = { response: null, notes: '' };
                });

                // Fetch existing response if any
                const responseRes = await fetch(`/api/checklists/${warehouse._id}`);
                if (responseRes.ok) {
                    const existingResponse = await responseRes.json();
                    existingResponse.items?.forEach((item: any) => {
                        const templateItem = template.items.find((t: any) =>
                            t.question === item.question && t.category === item.category
                        );
                        if (templateItem) {
                            initialResponses[templateItem._id] = {
                                response: item.response,
                                notes: item.notes || ''
                            };
                        }
                    });
                }
                setChecklistResponses(initialResponses);
            }
        } catch (err) {
            console.error('Error fetching checklist:', err);
        } finally {
            setChecklistStatus('idle');
        }
    };

    const handleChecklistResponse = (itemId: string, field: 'response' | 'notes', value: any) => {
        setChecklistResponses((prev: any) => ({
            ...prev,
            [itemId]: { ...prev[itemId], [field]: value }
        }));
    };

    const saveChecklist = async (status: 'in_progress' | 'completed') => {
        if (!warehouse?._id || !checklistTemplate) return;
        try {
            setChecklistStatus('saving');
            const items = checklistTemplate.items.map((item: any) => ({
                category: item.category,
                question: item.question,
                response: checklistResponses[item._id]?.response,
                notes: checklistResponses[item._id]?.notes,
            }));

            const res = await fetch('/api/checklists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    warehouseId: warehouse._id,
                    items,
                    status,
                }),
            });

            if (res.ok) {
                alert(status === 'completed' ? 'Checklist completed successfully!' : 'Checklist saved as draft');
                if (status === 'completed') {
                    setShowChecklistModal(false);
                }
            } else {
                alert('Failed to save checklist');
            }
        } catch (err) {
            alert('Error saving checklist');
        } finally {
            setChecklistStatus('idle');
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
                        <div className="flex items-center gap-3">
                            {isLeadAuditor && (
                                <>
                                    {warehouse?.auditStatus === 'in_progress' ? (
                                        <button
                                            onClick={() => handleAuditControl('close')}
                                            className="bg-red-600 text-white px-6 py-3 font-bold text-sm rounded-xl hover:bg-red-700 transition-all flex items-center shadow-lg"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" /> Finish Audit
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAuditControl('initiate')}
                                            className="bg-emerald-600 text-white px-6 py-3 font-bold text-sm rounded-xl hover:bg-emerald-700 transition-all flex items-center shadow-lg"
                                        >
                                            <Save className="w-4 h-4 mr-2" /> Start Audit
                                        </button>
                                    )}
                                    {warehouse?.auditStatus === 'completed' && (
                                        <button
                                            onClick={() => handleAuditControl('reset')}
                                            className="border-2 border-zinc-200 text-zinc-500 px-4 py-3 font-bold text-xs rounded-xl hover:bg-zinc-50 transition-all"
                                        >
                                            Reset Status
                                        </button>
                                    )}
                                </>
                            )}
                            {isStoreManager && (
                                <button
                                    onClick={() => setShowProductModal(true)}
                                    className="bg-black text-white px-6 py-3 font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all flex items-center shadow-lg"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add Item
                                </button>
                            )}
                            {isLeadAuditor && (
                                <button
                                    onClick={() => { fetchChecklist(); setShowChecklistModal(true); }}
                                    className="border-2 border-emerald-600 text-emerald-600 px-6 py-3 font-bold text-sm rounded-xl hover:bg-emerald-50 transition-all flex items-center shadow-lg"
                                >
                                    <ClipboardCheck className="w-4 h-4 mr-2" /> Verification Checklist
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Audit Status Banner */}
                    {isAuditor && !isAdmin && (
                        <div className={`mt-6 p-4 rounded-2xl flex items-center justify-between ${warehouse?.auditStatus === 'in_progress' ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
                            <div className="flex items-center">
                                {warehouse?.auditStatus === 'in_progress' ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-3" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-amber-600 mr-3" />
                                )}
                                <div>
                                    <p className={`text-sm font-bold ${warehouse?.auditStatus === 'in_progress' ? 'text-emerald-900' : 'text-amber-900'}`}>
                                        {warehouse?.auditStatus === 'in_progress' ? 'Audit is LIVE' : 'Audit is LOCKED'}
                                    </p>
                                    <p className={`text-xs font-medium ${warehouse?.auditStatus === 'in_progress' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {warehouse?.auditStatus === 'in_progress'
                                            ? 'You can now record physical counts.'
                                            : warehouse?.auditStatus === 'completed'
                                                ? 'This audit cycle has been completed.'
                                                : 'Please wait for your Lead Auditor to start the session.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search Bar */}
                    <div className="mt-6 relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-zinc-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search products by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-zinc-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/5 outline-none font-medium text-sm transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-black transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Table Section */}
                <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200">
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Item Details</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center w-24">Unit</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center w-40">Book Stock (ERP)</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center w-40">Book Stock Value</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center w-48">Store Manager / Set Stock</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center w-48">Auditor / Physical Count</th>
                                {/* <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right w-24">Status</th> */}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {filteredInventory.map((item) => (
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

                                    <td className="px-6 py-6 text-center">
                                        <span className="text-[10px] font-black text-black bg-zinc-100 px-2 py-1 rounded uppercase tracking-widest border border-zinc-200">
                                            {item.product.unit}
                                        </span>
                                    </td>

                                    <td className="px-6 py-6 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <input
                                                type="number"
                                                disabled={!isAdmin}
                                                value={inputs[item.product._id]?.bookStockVal || ''}
                                                onChange={(e) => handleInputChange(item.product._id, 'bookStock', e.target.value)}
                                                className={`w-20 px-2 py-1.5 border rounded-lg font-bold text-xs focus:ring-2 focus:ring-black outline-none text-center transition-all ${isAdmin ? 'bg-white border-zinc-200 focus:border-black' : 'bg-transparent border-transparent text-black cursor-default'
                                                    }`}
                                                placeholder="ERP"
                                            />
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleSave(item.product._id, 'bookStock')}
                                                    className="p-1.5 bg-zinc-100 text-black rounded-md hover:bg-black hover:text-white transition-all disabled:opacity-50"
                                                    disabled={saveStatus[item.product._id] === 'saving'}
                                                >
                                                    <Save className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-6 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <input
                                                type="number"
                                                disabled={!isAdmin}
                                                value={inputs[item.product._id]?.bookStockValue || ''}
                                                onChange={(e) => handleInputChange(item.product._id, 'bookStockValue', e.target.value)}
                                                className={`w-20 px-2 py-1.5 border rounded-lg font-bold text-xs focus:ring-2 focus:ring-black outline-none text-center transition-all ${isAdmin ? 'bg-white border-zinc-200 focus:border-black' : 'bg-transparent border-transparent text-black cursor-default'
                                                    }`}
                                                placeholder="Value"
                                            />
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleSave(item.product._id, 'bookStockValue')}
                                                    className="p-1.5 bg-zinc-100 text-black rounded-md hover:bg-black hover:text-white transition-all disabled:opacity-50"
                                                    disabled={saveStatus[item.product._id] === 'saving'}
                                                >
                                                    <Save className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </td>


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
                                                    onClick={() => handleSave(item.product._id, 'system')}
                                                    className="p-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
                                                    disabled={saveStatus[item.product._id] === 'saving'}
                                                >
                                                    <Save className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-6 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <input
                                                type="number"
                                                disabled={!isAuditor || warehouse?.auditStatus !== 'in_progress'}
                                                value={inputs[item.product._id]?.auditVal || ''}
                                                onChange={(e) => handleInputChange(item.product._id, 'audit', e.target.value)}
                                                className={`w-24 px-3 py-2 border rounded-lg font-bold text-sm focus:ring-2 focus:ring-black outline-none text-center transition-all ${isAuditor && warehouse?.auditStatus === 'in_progress'
                                                    ? 'bg-white border-zinc-200 focus:border-black'
                                                    : 'bg-zinc-50 border-zinc-100 text-zinc-400 cursor-not-allowed opacity-60'
                                                    }`}
                                                placeholder="Count"
                                            />
                                            {isAuditor && (
                                                <button
                                                    onClick={() => handleSave(item.product._id, 'audit')}
                                                    className="p-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
                                                    disabled={saveStatus[item.product._id] === 'saving' || inputs[item.product._id]?.auditVal === '' || warehouse?.auditStatus !== 'in_progress'}
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    {/* <td className="px-6 py-6 text-right">
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
                                    </td> */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredInventory.length === 0 && inventory.length > 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-zinc-100 rounded-[2.5rem] mt-8">
                        <Search className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                        <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">No products match your search</p>
                        <button
                            onClick={() => setSearchQuery('')}
                            className="mt-4 text-black border border-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-black hover:text-white transition-all"
                        >
                            Clear Search
                        </button>
                    </div>
                )}

                {inventory.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-zinc-100 rounded-[2.5rem] mt-8">
                        <Package className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                        <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">No products in this warehouse</p>
                        <button
                            onClick={() => setShowProductModal(true)}
                            className="mt-6 text-black border border-black px-6 py-2 rounded-xl text-xs font-bold hover:bg-black hover:text-white transition-all"
                        >
                            Add Your First Product
                        </button>
                    </div>
                )}
            </main>

            {showProductModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-black flex items-center">
                                    <Package className="w-5 h-5 mr-3" /> Add Item to {warehouse?.name}
                                </h3>
                                <p className="text-zinc-500 font-medium text-xs mt-1">Register new products specific to this location</p>
                            </div>
                            <button onClick={() => setShowProductModal(false)} className="text-zinc-400 hover:text-black transition-all p-2 rounded-full hover:bg-zinc-100">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center">
                                    <Plus className="w-4 h-4 mr-3 text-black" /> Individual Entry
                                </h4>
                                <form onSubmit={handleCreateProduct} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Product Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Premium Basmati Rice"
                                            required
                                            value={prodFormData.name}
                                            onChange={e => setProdFormData({ ...prodFormData, name: e.target.value })}
                                            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm transition-colors"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">SKU / Code</label>
                                            <input
                                                type="text"
                                                placeholder="SKU-001"
                                                required
                                                value={prodFormData.sku}
                                                onChange={e => setProdFormData({ ...prodFormData, sku: e.target.value })}
                                                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm transition-colors"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Initial Book Stock</label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    required
                                                    value={prodFormData.bookStock}
                                                    onChange={e => setProdFormData({ ...prodFormData, bookStock: e.target.value })}
                                                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Initial Book Value</label>
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    required
                                                    value={prodFormData.bookStockValue}
                                                    onChange={e => setProdFormData({ ...prodFormData, bookStockValue: e.target.value })}
                                                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-4 bg-black text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50"
                                    >
                                        {submitting ? 'Registering...' : 'Add Products to Warehouse'}
                                    </button>
                                    {prodError && <p className="text-xs font-bold text-red-500 text-center uppercase tracking-widest">{prodError}</p>}
                                </form>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center">
                                    <FileSpreadsheet className="w-4 h-4 mr-3 text-black" /> Bulk Import
                                </h4>
                                <div className="p-8 border border-dashed border-zinc-200 bg-zinc-50/50 rounded-3xl text-center">
                                    <input
                                        type="file"
                                        id="bulk-upload-wh"
                                        className="hidden"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleBulkUpload}
                                        disabled={bulkUploading}
                                    />
                                    <label
                                        htmlFor="bulk-upload-wh"
                                        className={`w-full py-10 border-2 border-white bg-white rounded-2xl flex flex-col items-center justify-center font-bold text-sm cursor-pointer hover:border-black transition-all ${bulkUploading ? 'opacity-50 cursor-wait' : ''}`}
                                    >
                                        <Upload className={`w-8 h-8 mb-3 ${bulkUploading ? 'animate-bounce text-zinc-300' : 'text-zinc-200'}`} />
                                        {bulkUploading ? 'Processing File...' : 'Choose Data File'}
                                    </label>

                                    <div className="mt-4 text-center">
                                        <a
                                            href="/templates/product_template.csv"
                                            download
                                            className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors flex items-center justify-center"
                                        >
                                            <FileSpreadsheet className="w-3 h-3 mr-1.5" />
                                            Download Sample Template
                                        </a>
                                    </div>

                                    {bulkSummary && (
                                        <div className="mt-8 p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm text-left">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-black mb-4">Upload Summary</h5>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 bg-green-50 rounded-xl">
                                                    <p className="text-[9px] font-bold text-green-600 uppercase">Items Added</p>
                                                    <p className="text-xl font-bold text-green-700">{bulkSummary.success}</p>
                                                </div>
                                                <div className="p-3 bg-zinc-50 rounded-xl">
                                                    <p className="text-[9px] font-bold text-zinc-400 uppercase">Duplicates</p>
                                                    <p className="text-xl font-bold text-zinc-500">{bulkSummary.skipped}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Verification Checklist Modal */}
            {showChecklistModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl my-8">
                        <div className="sticky top-0 bg-white border-b border-zinc-200 p-6 flex justify-between items-center rounded-t-2xl">
                            <div>
                                <h3 className="text-2xl font-bold text-black flex items-center">
                                    <ClipboardCheck className="w-6 h-6 mr-3 text-emerald-600" />
                                    Drum Verification Checklist
                                </h3>
                                <p className="text-sm text-zinc-500 mt-1">{warehouse?.name} - {warehouse?.code}</p>
                            </div>
                            <button
                                onClick={() => setShowChecklistModal(false)}
                                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {checklistStatus === 'loading' ? (
                            <div className="p-20 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                            </div>
                        ) : checklistTemplate ? (
                            <div className="p-6">
                                {/* Group items by category */}
                                {Object.entries(
                                    checklistTemplate.items.reduce((acc: any, item: any) => {
                                        if (!acc[item.category]) acc[item.category] = [];
                                        acc[item.category].push(item);
                                        return acc;
                                    }, {})
                                ).map(([category, items]: [string, any]) => (
                                    <div key={category} className="mb-8">
                                        <h4 className="text-lg font-bold text-black mb-4 pb-2 border-b-2 border-emerald-200 flex items-center">
                                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-sm mr-3">
                                                {category}
                                            </span>
                                        </h4>
                                        <div className="space-y-4">
                                            {items.map((item: any) => (
                                                <div key={item._id} className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                                                    <label className="block text-sm font-bold text-zinc-700 mb-3">
                                                        {item.question}
                                                    </label>

                                                    {item.responseType === 'yes_no' && (
                                                        <div className="flex items-center gap-6">
                                                            <label className="flex items-center cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name={`response-${item._id}`}
                                                                    checked={checklistResponses[item._id]?.response === true}
                                                                    onChange={() => handleChecklistResponse(item._id, 'response', true)}
                                                                    className="w-4 h-4 text-emerald-600 mr-2"
                                                                />
                                                                <span className="text-sm font-medium">Yes</span>
                                                            </label>
                                                            <label className="flex items-center cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name={`response-${item._id}`}
                                                                    checked={checklistResponses[item._id]?.response === false}
                                                                    onChange={() => handleChecklistResponse(item._id, 'response', false)}
                                                                    className="w-4 h-4 text-red-600 mr-2"
                                                                />
                                                                <span className="text-sm font-medium">No</span>
                                                            </label>
                                                            <label className="flex items-center cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name={`response-${item._id}`}
                                                                    checked={checklistResponses[item._id]?.response === 'N/A'}
                                                                    onChange={() => handleChecklistResponse(item._id, 'response', 'N/A')}
                                                                    className="w-4 h-4 text-zinc-400 mr-2"
                                                                />
                                                                <span className="text-sm font-medium text-zinc-500">N/A</span>
                                                            </label>
                                                        </div>
                                                    )}

                                                    {item.responseType === 'text' && (
                                                        <textarea
                                                            value={checklistResponses[item._id]?.response || ''}
                                                            onChange={(e) => handleChecklistResponse(item._id, 'response', e.target.value)}
                                                            className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:border-emerald-600 outline-none text-sm resize-none"
                                                            rows={3}
                                                            placeholder="Enter your notes here..."
                                                        />
                                                    )}

                                                    {item.responseType === 'number' && (
                                                        <input
                                                            type="number"
                                                            value={checklistResponses[item._id]?.response || ''}
                                                            onChange={(e) => handleChecklistResponse(item._id, 'response', Number(e.target.value))}
                                                            className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:border-emerald-600 outline-none text-sm"
                                                            placeholder="Enter number..."
                                                        />
                                                    )}

                                                    {item.responseType === 'yes_no' && (
                                                        <div className="mt-3">
                                                            <input
                                                                type="text"
                                                                value={checklistResponses[item._id]?.notes || ''}
                                                                onChange={(e) => handleChecklistResponse(item._id, 'notes', e.target.value)}
                                                                className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:border-emerald-600 outline-none text-xs"
                                                                placeholder="Additional notes (optional)..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Action Buttons */}
                                <div className="sticky bottom-0 bg-white border-t border-zinc-200 pt-6 mt-6 flex justify-between items-center">
                                    <button
                                        onClick={() => setShowChecklistModal(false)}
                                        className="px-6 py-3 border-2 border-zinc-300 text-zinc-700 font-bold text-sm rounded-xl hover:bg-zinc-50 transition-all"
                                        disabled={checklistStatus === 'saving'}
                                    >
                                        Cancel
                                    </button>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => saveChecklist('in_progress')}
                                            className="px-6 py-3 border-2 border-emerald-600 text-emerald-600 font-bold text-sm rounded-xl hover:bg-emerald-50 transition-all disabled:opacity-50 flex items-center"
                                            disabled={checklistStatus === 'saving'}
                                        >
                                            {checklistStatus === 'saving' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            Save Draft
                                        </button>
                                        <button
                                            onClick={() => saveChecklist('completed')}
                                            className="px-6 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center shadow-lg"
                                            disabled={checklistStatus === 'saving'}
                                        >
                                            {checklistStatus === 'saving' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            Submit Checklist
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-20 text-center">
                                <p className="text-zinc-500">No checklist template found. Please contact administrator.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
