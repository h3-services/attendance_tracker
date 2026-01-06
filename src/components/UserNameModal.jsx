
import React, { useState, useEffect } from 'react';

const UserNameModal = ({ isOpen, currentName, onSave, onClose }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        setName(currentName || '');
    }, [currentName]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2.5rem',
                borderRadius: '16px',
                width: '100%', maxWidth: '400px',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                <h2 style={{ marginTop: 0, color: '#1e293b' }}>Welcome to WorkTracker</h2>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                    Please enter your name to personalize your workspace and track your specific sessions.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Jeevith"
                        style={{
                            padding: '1rem',
                            fontSize: '1.1rem',
                            borderRadius: '8px',
                            border: '2px solid #e2e8f0',
                            textAlign: 'center',
                            outline: 'none'
                        }}
                        autoFocus
                        required
                    />
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    flex: 1, padding: '1rem', borderRadius: '8px', border: 'none',
                                    background: '#f1f5f9', color: '#475569', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            style={{
                                flex: 1,
                                padding: '1rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)'
                            }}
                        >
                            Get Started
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserNameModal;
