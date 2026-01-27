'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Package, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/dashboard');
        }
    }, [status, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('AUTHENTICATION_FAILED: INVALID CREDENTIALS');
                setLoading(false);
            } else if (result?.ok) {
                router.push('/dashboard');
                router.refresh();
            }
        } catch (err) {
            setError('SYSTEM_ERROR: UNEXPECTED DISRUPTION');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <div className="w-full max-w-md">
                {/* Brand Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex p-4 bg-black text-white mb-6">
                        <Package className="w-10 h-10" />
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">
                        Inventory Control
                    </h1>
                    <p className="text-zinc-400 font-black text-[10px] uppercase tracking-[0.4em] mt-4">
                        Secure Access Terminal
                    </p>
                </div>

                {/* Entry Form */}
                <div className="border-4 border-black p-8 sm:p-12">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {error && (
                            <div className="border-2 border-dashed border-black p-4 text-[10px] font-black uppercase text-center tracking-widest">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                Identity / Email
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-sm uppercase transition-all"
                                    placeholder="USER@SYSTEM.NET"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                Passphrase
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-12 py-4 border-2 border-zinc-100 focus:border-black outline-none font-black text-sm transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-black transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-black text-white font-black uppercase tracking-widest text-xs hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                'Establish Session'
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                        Operational Access Only | 256-Bit Encryption
                    </p>
                </div>
            </div>
        </div>
    );
}
