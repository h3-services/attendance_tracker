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
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                background: 'white',
                padding: '3rem',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        background: '#0f172a',
                        borderRadius: '12px',
                        margin: '0 auto 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        color: 'white'
                    }}>
                        ⚡
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        margin: '0 0 0.5rem 0'
                    }}>
                        Welcome Back
                    </h1>
                    <p style={{
                        margin: 0,
                        color: '#64748b',
                        fontSize: '0.95rem'
                    }}>
                        Enter your credentials to access
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                        <label style={labelStyle}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                        <label style={labelStyle}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={inputStyle}
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: '#ef4444',
                            fontSize: '0.85rem',
                            marginBottom: '1rem',
                            background: '#fef2f2',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #fee2e2'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '0.85rem',
                            background: loading ? '#94a3b8' : '#0f172a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: loading ? 'wait' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.2)'
                        }}
                    >
                        {loading ? 'Processing...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Authorized Personnel Only
                </div>
            </div>
        </div>
    );
};

const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.5rem'
};

const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box'
};

export default LoginPage;
