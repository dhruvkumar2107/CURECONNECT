import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { signInWithEmailAndPassword } from '../services/firebase';
import { auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';

export const PartnerLoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useApp();

    // Redirect when user role is confirmed as partner
    useEffect(() => {
        if (user?.role === 'partner') {
            navigate('/partnership-dashboard');
        }
    }, [user, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log("✅ [Auth] Login success. Waiting for role sync...");
        } catch (err: any) {
            setError("Invalid email or password.");
            setLoading(false);
            console.error(err);
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
                        <Store size={24} />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900">Partner Login</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Manage your pharmacy inventory and orders
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-t-xl relative block w-full px-10 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                placeholder="Partner Email"
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-b-xl relative block w-full px-10 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 transition-colors"
                        >
                            {loading ? 'Signing in...' : 'Sign in to Dashboard'}
                        </button>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-sm text-slate-500">
                        Interested in partnering?{' '}
                        <Link to="/partner-signup" className="font-bold text-teal-600 hover:text-teal-500 transition-colors">
                            Register Pharmacy
                        </Link>
                    </p>
                </div>

                <div className="text-center mt-4">
                    <Link to="/login" className="text-sm text-slate-500 hover:text-teal-600 flex items-center justify-center gap-1">
                        Not a partner? User Login <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </div>
    );
};
