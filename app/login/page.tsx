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
                setError('Login failing: Check your email and password');
                setLoading(false);
            } else if (result?.ok) {
                router.push('/dashboard');
                router.refresh();
            }
        } catch (err) {
            setError('System error: Please try again later');
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
                    <h1 className="text-3xl font-bold text-black">
                        Inventory Audit
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm mt-3">
                        Sign in to your account
                    </p>
                </div>

                {/* Entry Form */}
                <div className="border border-zinc-200 p-8 sm:p-10 shadow-sm rounded-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-zinc-50 border border-zinc-200 p-3 text-xs font-bold text-center text-black">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                Email Address
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-3 border border-zinc-200 focus:border-black outline-none font-medium text-sm transition-all rounded-lg"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-12 py-3 border border-zinc-200 focus:border-black outline-none font-medium text-sm transition-all rounded-lg"
                                    placeholder="Your password"
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
                            className="w-full py-4 bg-black text-white font-bold text-sm hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center rounded-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs font-medium text-zinc-400">
                        Secure Access System
                    </p>
                </div>
            </div>
        </div>
    );
}
