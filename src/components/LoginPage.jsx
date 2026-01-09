import React, { useState } from 'react';
import { loginUser } from '../api';

const LoginPage = ({ onLogin }) => {

    // UI State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please fill in all credentials');
            return;
        }

        setLoading(true);

        try {


            // Login Action Only
            const result = await loginUser(email, password);

            if (result && result.status === 'success') {
                // Login successful
                onLogin({
                    name: result.user.name,
                    email: result.user.email,
                    role: result.user.role // Added Role
                });
            } else {
                setError(result?.message || 'Authentication failed');
            }

        } catch (err) {
            setError(err.message || 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 font-sans">
            <div className="bg-white p-12 rounded-2xl shadow-xl w-full max-w-[400px] text-center border border-slate-100">
                <div className="mb-8">
                    <div className="w-[60px] h-[60px] bg-slate-900 rounded-xl mx-auto mb-6 flex items-center justify-center text-3xl text-white shadow-lg">
                        ⚡
                    </div>
                    <h1 className="text-[1.75rem] font-extrabold text-slate-900 mb-2 leading-tight">
                        Welcome Back
                    </h1>
                    <p className="m-0 text-slate-500 text-[0.95rem]">
                        Enter your credentials to access
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4 text-left">
                        <label className="block text-[0.85rem] font-semibold text-slate-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 text-base outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all box-border placeholder:text-slate-400"
                        />
                    </div>

                    <div className="mb-6 text-left">
                        <label className="block text-[0.85rem] font-semibold text-slate-700 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 text-base outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all box-border placeholder:text-slate-400"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-[0.85rem] mb-4 bg-red-50 p-3 rounded-lg border border-red-100 animate-pulse">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 rounded-lg text-white text-base font-bold shadow-md transition-all border-none
                            ${loading ? 'bg-slate-400 cursor-wait' : 'bg-slate-900 hover:bg-slate-800 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 shadow-slate-900/20'}`}
                    >
                        {loading ? 'Processing...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-[0.8rem] text-slate-400 font-medium tracking-wide uppercase">
                    Authorized Personnel Only
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
