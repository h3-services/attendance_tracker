
import React, { useState, useEffect } from 'react';

const calculateDuration = (start, end) => {
    if (!start || !end) return '00 HRS : 00 MIN : 00 SEC';
    const today = new Date().toISOString().slice(0, 10);
    const startDate = new Date(`${today}T${start}:00`);
    const endDate = new Date(`${today}T${end}:00`);

    if (endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1);
    }

    let diffSec = Math.floor((endDate - startDate) / 1000);
    if (diffSec < 0) diffSec = 0;

    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = Math.floor(diffSec % 60);

    const hh = h < 10 ? "0" + h : h;
    const mm = m < 10 ? "0" + m : m;
    const ss = s < 10 ? "0" + s : s;

    return `${hh} HRS : ${mm} MIN : ${ss} SEC`;
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
            const cleanTime = (t) => {
                if (!t) return '';
                if (t.includes('T')) {
                    const d = new Date(t);
                    return !isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                }
                return t.substring(0, 5);
            };

            const cleanDate = (dStr) => {
                if (!dStr) return '';
                if (String(dStr).includes('T')) {
                    const dateObj = new Date(dStr);
                    if (!isNaN(dateObj.getTime())) {
                        const year = dateObj.getFullYear();
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }
                }
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
        onSave({ ...session, ...formData });
    };

    const handleDelete = () => {
        onDelete(session.recordId);
    };

    const isNew = !session?.recordId;

    // Styles
    const modalOverlayStyle = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)', // Darker dim for focus
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
    };

    const modalContainerStyle = {
        backgroundColor: '#ffffff',
        width: '100%', maxWidth: '550px', // Focused width
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid #f1f5f9'
    };

    const headerStyle = {
        padding: '24px 32px 16px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
    };

    const bodyStyle = {
        padding: '32px',
        display: 'flex', flexDirection: 'column', gap: '24px'
    };

    const footerStyle = {
        padding: '20px 32px',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #f1f5f9',
        display: 'flex', justifyContent: 'flex-end', gap: '12px',
        borderRadius: '0 0 24px 24px'
    };

    const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem', color: '#0f172a', backgroundColor: 'white', transition: 'all 0.2s' };

    // Derived Date Display
    const dateDisplay = formData.date ? new Date(formData.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select Date';

    return (
        <div style={modalOverlayStyle}>
            <form onSubmit={handleSubmit} style={modalContainerStyle}>

                {/* 1. Header Area */}
                <div style={headerStyle}>
                    <div>
                        <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', color: '#0f172a', fontWeight: 700, letterSpacing: '-0.02em' }}>
                            {isNew ? 'New Session' : `Session #${session.sessionNo}`}
                        </h2>
                        <div style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>
                            {dateDisplay}
                        </div>
                    </div>
                    {/* Edit Date Button (Only if editing or explicitly needed, simplified for now to just be view-only for new) */}
                    {!isNew && (
                        <div style={{ position: 'relative' }}>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                style={{
                                    opacity: 0, position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%', cursor: 'pointer'
                                }}
                            />
                            <button type="button" style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#3b82f6', background: '#eff6ff', border: 'none', borderRadius: '6px', fontWeight: 600 }}>
                                Change Date
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. Main Form Body */}
                <div style={bodyStyle}>

                    {/* Row 1: Time & Status (Grid) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                        {/* Time Block */}
                        <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}>Start Time</label>
                                <input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => {
                                        const newData = { ...formData, startTime: e.target.value };
                                        const dur = calculateDuration(newData.startTime, newData.endTime);
                                        setFormData({ ...newData, duration: dur });
                                    }}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>End Time</label>
                                <input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => {
                                        const newData = { ...formData, endTime: e.target.value };
                                        const dur = calculateDuration(newData.startTime, newData.endTime);
                                        setFormData({ ...newData, duration: dur });
                                    }}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Project Block */}
                        <div>
                            <label style={labelStyle}>Project</label>
                            <input
                                type="text"
                                value={formData.project}
                                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                                style={inputStyle}
                                placeholder="Project Name"
                            />
                        </div>

                        {/* Category Block */}
                        <div>
                            <label style={labelStyle}>Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="">Select...</option>
                                <option value="Critical">Critical</option>
                                <option value="Good to have">Good to have</option>
                                <option value="Normal">Normal</option>
                                <option value="Not Required">Not Required</option>
                            </select>
                        </div>

                        {/* Status Block */}
                        <div>
                            <label style={labelStyle}>Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="Completed">Completed</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Blocked">Blocked</option>
                            </select>
                        </div>

                        {/* Approval Block */}
                        <div>
                            <label style={labelStyle}>Approval</label>
                            <select
                                value={formData.approvedState}
                                onChange={(e) => setFormData({ ...formData, approvedState: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="Approved">Approved</option>
                                <option value="Rework Needed">Rework Needed</option>
                                <option value="In Reviewing">In Reviewing</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>

                    </div>

                    {/* Row 2: Description (Full Width) */}
                    <div>
                        <label style={labelStyle}>Work Description</label>
                        <textarea
                            value={formData.workDescription}
                            onChange={(e) => setFormData({ ...formData, workDescription: e.target.value })}
                            style={{
                                ...inputStyle,
                                minHeight: '120px',
                                lineHeight: '1.5',
                                resize: 'vertical'
                            }}
                            placeholder="What did you work on during this period?"
                            required
                        />
                    </div>
                </div>

                {/* 3. Footer Actions */}
                <div style={footerStyle}>
                    {!isNew && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            style={{
                                marginRight: 'auto',
                                padding: '10px 16px', borderRadius: '10px', border: 'none',
                                background: '#fee2e2', color: '#ef4444', fontWeight: 600, cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            Delete
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
                            background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        style={{
                            padding: '10px 24px',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#0ea5e9', // Sky Blue
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.3)'
                        }}
                    >
                        {isNew ? 'Create Record' : 'Save Changes'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default EditSessionModal;
