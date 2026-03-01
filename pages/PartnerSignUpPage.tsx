import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Store, Mail, Lock, User, MapPin, Phone, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export const PartnerSignUpPage = () => {
    const [formData, setFormData] = useState({
        pharmacyName: '',
        email: '',
        password: '',
        address: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Create Partner in Auth
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            // 2. Update Profile Display Name (Pharmacy Name)
            await updateProfile(user, {
                displayName: formData.pharmacyName
            });

            // 3. Create Partner Document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name: formData.pharmacyName,
                email: formData.email,
                role: 'partner',
                address: formData.address,
                phone: formData.phone,
                points: 0,
                createdAt: new Date().toISOString()
            });

            // 4. Also add to pharmacies collection for public display
            await setDoc(doc(db, 'pharmacies', user.uid), {
                id: user.uid,
                name: formData.pharmacyName,
                address: formData.address,
                phone: formData.phone,
                type: 'Local Store', // Default
                rating: 0,
                inventory: []
            });

            navigate('/partnership-dashboard');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password should be at least 6 characters.');
            } else {
                setError('Failed to create account: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link to="/partner-login" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-6 font-medium transition-colors">
                    <ArrowLeft size={16} /> Back to Login
                </Link>
                <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-100 sm:px-10">
                    <div className="text-center mb-8">
                        <div className="mx-auto h-12 w-12 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mb-4">
                            <Store size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Partner Registration</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Join CureConnect to grow your pharmacy business
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-1">
                            <AlertCircle size={18} className="flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSignUp}>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Pharmacy Name</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400">
                                    <Store size={18} />
                                </span>
                                <input
                                    type="text"
                                    name="pharmacyName"
                                    required
                                    value={formData.pharmacyName}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all sm:text-sm"
                                    placeholder="Apollo Pharmacy, etc."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Business Email</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400">
                                    <Mail size={18} />
                                </span>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all sm:text-sm"
                                    placeholder="contact@pharmacy.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    minLength={6}
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all sm:text-sm"
                                    placeholder="Min. 6 characters"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Store Address</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400">
                                    <MapPin size={18} />
                                </span>
                                <textarea
                                    name="address"
                                    required
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows={2}
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all sm:text-sm"
                                    placeholder="Complete street address"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Contact Phone</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400">
                                    <Phone size={18} />
                                </span>
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all sm:text-sm"
                                    placeholder="+91 00000 00000"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 transition-all shadow-teal-100"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin h-5 w-5" />
                                ) : (
                                    'Create Partner Account'
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                        <p className="text-sm text-slate-500">
                            Already have a partner account?{' '}
                            <Link to="/partner-login" className="font-bold text-teal-600 hover:text-teal-500">
                                Login Here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
