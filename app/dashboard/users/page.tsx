'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import {
    Users,
    UserPlus,
    Shield,
    Lock,
    X,
    Check,
    AlertCircle,
    UserCheck,
    Briefcase,
    Building2,
    Database,
    Trash2
} from 'lucide-react';

interface Organization {
    _id: string;
    name: string;
    code: string;
}

interface UserData {
    _id: string;
    name: string;
    email: string;
    role: string;
    organization?: Organization;
    organizations?: Organization[];
    createdAt: string;
}

export default function UsersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<UserData[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'auditor',
        organizationId: '',
        organizationIds: [] as string[],
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [status, session, router]);

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role === 'admin') {
            fetchUsers();
            fetchOrganizations();
        }
    }, [status, session]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                setError((await response.json()).error || 'Sync Error');
            }
        } catch (err) { setError('Failed to load users'); } finally { setLoading(false); }
    };

    const fetchOrganizations = async () => {
        try {
            const response = await fetch('/api/organizations');
            if (response.ok) setOrganizations(await response.json());
        } catch (err) { }
    };

    const handleOrgToggle = (orgId: string) => {
        setFormData(prev => {
            const current = [...prev.organizationIds];
            if (current.includes(orgId)) {
                return { ...prev, organizationIds: current.filter(id => id !== orgId) };
            } else {
                return { ...prev, organizationIds: [...current, orgId] };
            }
        });
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setSuccess(''); setSubmitting(true);

        if (formData.role === 'store_manager' && !formData.organizationId) {
            setError('Scope required for Store Manager'); setSubmitting(false); return;
        }

        if (formData.role === 'auditor' && formData.organizationIds.length === 0) {
            setError('At least one hub required for Auditor'); setSubmitting(false); return;
        }

        try {
            const response = await fetch('/api/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    secretKey: 'your-super-secret-key-change-this-in-prod',
                }),
            });

            if (response.ok) {
                setSuccess(`Provisioned ${formData.name}`);
                setFormData({ name: '', email: '', password: '', role: 'auditor', organizationId: '', organizationIds: [] });
                fetchUsers();
                setTimeout(() => { setShowCreateModal(false); setSuccess(''); }, 2000);
            } else {
                setError((await response.json()).error || 'Provisioning Failed');
            }
        } catch (err) { setError('Unexpected Error'); } finally { setSubmitting(false); }
    };

    const deleteUser = async (userId: string) => {
        if (!confirm('EXTERMINATE ACCOUNT? THIS ACTION IS FINAL.')) return;
        try {
            const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            if (response.ok) setUsers(users.filter(u => u._id !== userId));
            else setError((await response.json()).error || 'Cleanup Failed');
        } catch (err) { setError('Error'); }
    };

    if (status === 'loading') return null;

    const formatRole = (role: string) => {
        return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    return (
        <div className="min-h-screen bg-white text-black">
            <DashboardHeader />

            <main className="max-w-7xl mx-auto px-4 py-12">
                <div className="flex justify-between items-end mb-12 border-b-4 border-black pb-8">
                    <div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter">System / Identities</h2>
                        <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-2">Access Provisioning Control</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-black text-white px-10 py-5 font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all flex items-center shadow-2xl"
                    >
                        <UserPlus className="w-4 h-4 mr-3" /> Create Identity
                    </button>
                </div>

                {success && (
                    <div className="border-2 border-black p-4 mb-8 flex items-center space-x-4 bg-zinc-50">
                        <Check className="w-6 h-6" />
                        <span className="font-black text-xs uppercase tracking-widest">{success}</span>
                    </div>
                )}

                {error && (
                    <div className="border-2 border-dashed border-zinc-200 text-black p-4 mb-8 flex items-center space-x-4">
                        <AlertCircle className="w-6 h-6" />
                        <span className="font-bold text-xs uppercase tracking-widest">{error}</span>
                    </div>
                )}

                <div className="border-4 border-black bg-white overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-black text-white">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Identity Node</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Security Level</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Deployment Scope</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-right">Termination</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-zinc-100">
                            {users.map((user) => (
                                <tr key={user._id} className="hover:bg-zinc-50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 border-2 border-black flex items-center justify-center font-black text-lg mr-5">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black uppercase tracking-tight">{user.name}</div>
                                                <div className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-tight">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] border-2 border-zinc-100 px-3 py-1">
                                            {formatRole(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-2">
                                            {user.role === 'admin' ? (
                                                <span className="text-[10px] font-black uppercase tracking-widest border-l-4 border-black pl-3 text-zinc-400">Global Admin Scope</span>
                                            ) : user.role === 'auditor' ? (
                                                user.organizations?.map((org: any) => (
                                                    <span key={org._id} className="text-[9px] font-black border border-zinc-200 px-2 py-0.5 uppercase tracking-tighter">
                                                        {org.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[10px] font-black uppercase tracking-tight">
                                                    {typeof user.organization === 'object' ? (user.organization as any)?.name : '-'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            className="text-zinc-200 hover:text-black transition-all p-2 disabled:opacity-0"
                                            onClick={() => deleteUser(user._id)}
                                            disabled={user.email === session?.user?.email}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black max-w-xl w-full p-12 overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center mb-12 border-b-2 border-black pb-6">
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter">Provisioning</h3>
                                <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest mt-1">Configure Identity Parameters</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-black hover:opacity-50"><X className="w-10 h-10" /></button>
                        </div>
                        <form onSubmit={handleCreateUser} className="space-y-8">
                            <div className="space-y-6">
                                <input type="text" placeholder="IDENTITY_NAME" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-xs uppercase" />
                                <input type="email" placeholder="SYSTEM_AUTH_EMAIL" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-xs uppercase" />
                                <input type="password" placeholder="SECURE_PHRASE" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-xs uppercase" />

                                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-6 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-xs uppercase appearance-none">
                                    <option value="auditor">Field Auditor (Multi-Scope)</option>
                                    <option value="store_manager">Store Manager (Localized)</option>
                                    <option value="admin">Nexus Controller</option>
                                </select>

                                {formData.role === 'store_manager' && (
                                    <div className="border-4 border-black p-6 space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center"><Building2 className="w-4 h-4 mr-3" /> Hub Assignment</h4>
                                        <select required value={formData.organizationId} onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })} className="w-full px-4 py-3 border-2 border-zinc-100 font-bold text-xs uppercase outline-none">
                                            <option value="">Select Primary Hub</option>
                                            {organizations.map(org => <option key={org._id} value={org._id}>{org.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {formData.role === 'auditor' && (
                                    <div className="border-4 border-black p-6 space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center"><Database className="w-4 h-4 mr-3" /> Multi-Hub Access Scope</h4>
                                        <div className="max-h-48 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                                            {organizations.map(org => (
                                                <label key={org._id} className="flex items-center space-x-4 cursor-pointer group">
                                                    <div onClick={() => handleOrgToggle(org._id)} className={`w-5 h-5 border-2 border-black flex items-center justify-center transition-all ${formData.organizationIds.includes(org._id) ? 'bg-black text-white' : 'bg-white'}`}>
                                                        {formData.organizationIds.includes(org._id) && <Check className="w-4 h-4" />}
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-tight group-hover:underline">{org.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button type="submit" disabled={submitting} className="w-full py-6 bg-black text-white font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all">
                                {submitting ? 'Authenticating...' : 'Authorize Identity'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
