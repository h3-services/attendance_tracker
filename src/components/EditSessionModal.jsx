
import React, { useState, useEffect } from 'react';

const calculateDuration = (start, end) => {
    if (!start || !end) return '';
    const today = new Date().toISOString().slice(0, 10);
    const startDate = new Date(`${today}T${start}:00`);
    const endDate = new Date(`${today}T${end}:00`);

    // Handle overnight (if end < start, assume next day)
    if (endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1);
    }

    const diffSec = Math.floor((endDate - startDate) / 1000);
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);

    let parts = [];
    if (h > 0) parts.push(`${h} hr`);
    if (m > 0) parts.push(`${m} mins`);
    if (parts.length === 0) parts.push(`0 mins`); // Fallback

    return parts.join(' ');
};

const EditSessionModal = ({ isOpen, onClose, session, onSave, onDelete }) => {
    const [formData, setFormData] = useState({
        workDescription: '',
        project: '',
        category: '',
        startTime: '',
        endTime: '',
        duration: '',
        date: '',
        status: '',
        approvedState: ''
    });

    useEffect(() => {
        if (session) {
            // Safe parse info HH:MM
            const cleanTime = (t) => {
                if (!t) return '';
                if (t.includes('T')) {
                    const d = new Date(t);
                    return !isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                }
                return t.substring(0, 5); // Assume HH:MM:SS -> HH:MM
            };

            // Safe parse date to Local YYYY-MM-DD
            const cleanDate = (dStr) => {
                if (!dStr) return '';
                // If it looks like ISO (2026-01-06T...), parse to Date object first
                if (String(dStr).includes('T')) {
                    const dateObj = new Date(dStr);
                    if (!isNaN(dateObj.getTime())) {
                        const year = dateObj.getFullYear();
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }
                }
                // Fallback for simple strings or unexpected formats
                return String(dStr).slice(0, 10);
            };

            setFormData({
                workDescription: session.workDescription || '',
                project: session.project || '',
                category: session.category || '',
                startTime: cleanTime(session.startTime),
                endTime: cleanTime(session.endTime),
                duration: session.duration || '',
                date: cleanDate(session.date),
                status: session.status || 'Completed',
                approvedState: session.approvedState || 'Pending'
            });
        }
    }, [session]);

    if (!isOpen || !session) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        // MERGE existing session data with form updates to prevent data loss
        // This ensures fields like userName, date, status are sent back to the API
        onSave({ ...session, ...formData });
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this session? This cannot be undone.")) {
            onDelete(session.recordId);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '16px',
                width: '100%', maxWidth: '450px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Edit Session #{session.sessionNo}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#475569' }}>Description</label>
                        <textarea
                            value={formData.workDescription}
                            onChange={(e) => setFormData({ ...formData, workDescription: e.target.value })}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px' }}
                            required
                        />
                    </div>

                    {/* Main Meta Data (Date & Status) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#475569' }}>Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#f1f5f9', // Light grey to indicate disabled
                                    cursor: 'not-allowed',
                                    color: '#64748b'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#475569' }}>Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="Completed">Completed</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#475569' }}>Approval</label>
                            <select
                                value={formData.approvedState}
                                onChange={(e) => setFormData({ ...formData, approvedState: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="Approved">Approved</option>
                                <option value="Pending">Pending</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    {/* Time Editing Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#475569' }}>Start Time</label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => {
                                    setFormData(prev => {
                                        const newData = { ...prev, startTime: e.target.value };
                                        // Auto-calc duration
                                        const dur = calculateDuration(newData.startTime, newData.endTime);
                                        return { ...newData, duration: dur };
                                    });
                                }}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#475569' }}>End Time</label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => {
                                    setFormData(prev => {
                                        const newData = { ...prev, endTime: e.target.value };
                                        // Auto-calc duration
                                        const dur = calculateDuration(newData.startTime, newData.endTime);
                                        return { ...newData, duration: dur };
                                    });
                                }}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    </div>

                    {/* Duration Feedback */}
                    {formData.duration && (
                        <div style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            backgroundColor: formData.endTime < formData.startTime ? '#fff1f2' : '#f8fafc',
                            border: formData.endTime < formData.startTime ? '1px solid #fecaca' : '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Calculated Duration:</span>
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{formData.duration}</span>
                            </div>
                            {formData.endTime < formData.startTime && formData.startTime && formData.endTime && (
                                <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                    ⚠️ End time is before Start time. Treated as next day.
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#475569' }}>Project</label>
                            <input
                                type="text"
                                value={formData.project}
                                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#475569' }}>Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="">Select...</option>
                                <option value="Development">Development</option>
                                <option value="Meeting">Meeting</option>
                                <option value="Planning">Planning</option>
                                <option value="Learning">Learning</option>
                                <option value="Support">Support</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={handleDelete}
                            style={{
                                flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #ef4444',
                                background: 'white', color: '#ef4444', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            Delete
                        </button>
                        <button
                            type="submit"
                            style={{
                                flex: 2, padding: '0.8rem', borderRadius: '8px', border: 'none',
                                background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditSessionModal;
