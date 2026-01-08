import React, { useState, useEffect } from 'react';
import { fetchAuthData, createRecord, fetchData, deleteAuthRecord, registerUser } from '../api';

const AdminDashboard = ({ onBack, onLogout }) => {
    const [activeTab, setActiveTab] = useState('requests');
    const [requests, setRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(null); // Track which record is being approved
    const [rejecting, setRejecting] = useState(null); // Track record being rejected for loading state
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [recordToReject, setRecordToReject] = useState(null);
    const [deleteType, setDeleteType] = useState('request'); // 'request' or 'user'

    // Add User Modal State
    const [addUserModalOpen, setAddUserModalOpen] = useState(false);
    const [newUserLoading, setNewUserLoading] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });

    // Global History State
    const [globalHistory, setGlobalHistory] = useState([]);
    const [loadingGlobal, setLoadingGlobal] = useState(false);
    // Default to Today's date (YYYY-MM-DD)
    const [historyFilterDate, setHistoryFilterDate] = useState(() => {
        const today = new Date();
        // Manual formatting to avoid timezone issues/locale dep
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    // Fetch real data from Auth API
    // Fetch real data from Auth API
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await fetchAuthData();
                console.log('Auth API Data:', data); // Debug log

                // Get all sessions and users
                const allSessions = data.sessions || [];
                const allUsers = data.users || [];

                // Show ALL requests (not just pending)
                setRequests(allSessions);
                setUsers(allUsers);
            } catch (error) {
                console.error('Failed to load admin data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Filter History
    // Filter History
    const filteredHistory = historyFilterDate
        ? globalHistory.filter(item => {
            if (!item.date) return false;
            // Normalize item.date (M/D/YYYY) to YYYY-MM-DD for comparison
            const itemDate = new Date(item.date);
            const filterInputDate = new Date(historyFilterDate);

            // Compare YYYY-MM-DD strings
            const itemDateStr = itemDate.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
            const filterDateStr = filterInputDate.toLocaleDateString('en-CA');

            return itemDateStr === filterDateStr;
        })
        : globalHistory;

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await fetchAuthData();
                console.log('Auth API Data:', data); // Debug log

                // Get all sessions and users
                const allSessions = data.sessions || [];
                const allUsers = data.users || [];

                // Show ALL requests (not just pending)
                setRequests(allSessions);
                setUsers(allUsers);
            } catch (error) {
                console.error('Failed to load admin data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Fetch Global History when tab is active
    useEffect(() => {
        if (activeTab === 'history' && globalHistory.length === 0) {
            const loadGlobalHistory = async () => {
                setLoadingGlobal(true);
                try {
                    console.log('Fetching Global History...');
                    // fetchData without params gets ALL records (read action)
                    const data = await fetchData({});
                    console.log('Global History Raw Data:', data);
                    setGlobalHistory(data);
                } catch (error) {
                    console.error('Failed to load global history:', error);
                } finally {
                    setLoadingGlobal(false);
                }
            };
            loadGlobalHistory();
        }
    }, [activeTab, globalHistory.length]);

    // Approve: Sync this record to main data sheet
    const handleApprove = async (record) => {
        setApproving(record.recordId);
        try {
            // Fetch existing data to calculate session number
            const existingData = await fetchData({ userName: record.userName });

            // Calculate next session number for this date
            const sameDateSessions = existingData.filter(s => s.date === record.date);
            const maxSession = sameDateSessions.reduce((max, s) => {
                const num = parseInt(s.sessionNo) || 0;
                return num > max ? num : max;
            }, 0);
            const nextSessionNo = maxSession + 1;

            // Create record in main data sheet
            await createRecord({
                date: record.date,
                userName: record.userName,
                sessionNo: nextSessionNo.toString(),
                startTime: record.startTime,
                endTime: record.endTime,
                duration: record.duration,
                workDescription: record.workDescription,
                project: record.project,
                category: record.category,
                status: record.status || 'Completed',
                approvedState: 'Completed',
                approvedBy: 'Admin'
            });

            // Delete from Auth API (Requests sheet) after successful sync
            await deleteAuthRecord(record.recordId);

            // Remove from list after successful sync & delete
            setRequests(prev => prev.filter(r => r.recordId !== record.recordId));
        } catch (error) {
            console.error('Approve failed:', error);
        } finally {
            setApproving(null);
        }
    };

    const handleRejectClick = (recordId, type = 'request') => {
        setRecordToReject(recordId);
        setDeleteType(type);
        setRejectModalOpen(true);
    };

    const confirmReject = async () => {
        if (!recordToReject) return;
        setRejecting(recordToReject);
        try {
            const sheetName = deleteType === 'user' ? 'Users' : 'Requests';
            await deleteAuthRecord(recordToReject, sheetName);

            if (deleteType === 'user') {
                setUsers(prev => prev.filter(u => u.recordId !== recordToReject));
            } else {
                setRequests(prev => prev.filter(r => r.recordId !== recordToReject));
            }

            setRejectModalOpen(false);
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setRejecting(null);
            setRecordToReject(null);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setNewUserLoading(true);
        try {
            const response = await registerUser(
                newUser.email,
                newUser.password,
                newUser.name,
                newUser.role
            );

            // Add to local list to update UI immediately
            const today = new Date();
            const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

            const newUserData = {
                name: newUser.name,
                email: newUser.email,
                role: newUser.role, // Keep original casing from input
                createdAt: formattedDate,
                recordId: response.recordId || Date.now().toString()
            };

            setUsers(prev => [...prev, newUserData]);
            setAddUserModalOpen(false);
            setNewUser({ name: '', email: '', password: '', role: 'user' });
            alert('User created successfully!');
        } catch (error) {
            console.error('Add user failed:', error);
            alert(`Failed to create user: ${error.message}`);
        } finally {
            setNewUserLoading(false);
        }
    };

    const stats = {
        totalRequests: requests.length,
        pendingRequests: requests.filter(r => r.approvedState?.toLowerCase() === 'pending').length,
        totalUsers: users.length,
        adminUsers: users.filter(u => u.role?.toLowerCase() === 'admin').length
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', fontFamily: 'var(--font-sans)' }}>
            {/* Header */}
            <header style={{
                backgroundColor: '#1e40af',
                color: 'white',
                padding: '1rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-md)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>⚙️</span>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Admin Dashboard</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={onBack}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        ← Back
                    </button>
                    <button
                        onClick={onLogout}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                    <StatCard title="Pending Requests" value={stats.pendingRequests} color="#f59e0b" icon="⏳" />
                    <StatCard title="Total Requests" value={stats.totalRequests} color="#3b82f6" icon="📋" />
                    <StatCard title="Total Users" value={stats.totalUsers} color="#10b981" icon="👥" />
                    <StatCard title="Admin Users" value={stats.adminUsers} color="#8b5cf6" icon="🛡️" />
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)' }}>
                    <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')}>
                        Pending Requests
                    </TabButton>
                    <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
                        All Users
                    </TabButton>
                    <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
                        Global History
                    </TabButton>
                </div>

                {/* Content */}
                {activeTab === 'requests' && (
                    <div style={{ background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>User</th>
                                    <th style={thStyle}>Start</th>
                                    <th style={thStyle}>End</th>
                                    <th style={thStyle}>Duration</th>
                                    <th style={thStyle}>Description</th>
                                    <th style={thStyle}>Project</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                            Loading requests...
                                        </td>
                                    </tr>
                                ) : requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                            No requests found
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((req, idx) => (
                                        <tr key={req.recordId} style={{ backgroundColor: idx % 2 === 0 ? '#f8fafc' : 'white' }}>
                                            <td style={tdStyle}>{req.date}</td>
                                            <td style={tdStyle}>{req.userName}</td>
                                            <td style={tdStyle}>{req.startTime}</td>
                                            <td style={tdStyle}>{req.endTime}</td>
                                            <td style={tdStyle}>{req.duration}</td>
                                            <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.workDescription}</td>
                                            <td style={tdStyle}>{req.project}</td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '20px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    backgroundColor: '#fef3c7',
                                                    color: '#92400e'
                                                }}>
                                                    {req.approvedState}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => handleApprove(req)}
                                                        disabled={approving === req.recordId}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            backgroundColor: approving === req.recordId ? '#94a3b8' : '#10b981',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: approving === req.recordId ? 'wait' : 'pointer',
                                                            fontWeight: 600,
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        {approving === req.recordId ? '⏳' : '✓'} {approving === req.recordId ? 'Syncing...' : 'Approve'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectClick(req.recordId)}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            backgroundColor: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontWeight: 600,
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        ✗ Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div style={{ background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid #e2e8f0' }}>
                                <button
                                    onClick={() => setAddUserModalOpen(true)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    + Add User
                                </button>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
                                        <th style={thStyle}>Name</th>
                                        <th style={thStyle}>Email</th>
                                        <th style={thStyle}>Role</th>
                                        <th style={thStyle}>Created At</th>
                                        <th style={thStyle}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                Loading users...
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                No users found
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user, idx) => (
                                            <tr key={user.email} style={{ backgroundColor: idx % 2 === 0 ? '#f8fafc' : 'white' }}>
                                                <td style={tdStyle}>{user.name}</td>
                                                <td style={tdStyle}>{user.email}</td>
                                                <td style={tdStyle}>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '20px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        backgroundColor: user.role?.toLowerCase() === 'admin' ? '#dbeafe' : '#e0e7ff',
                                                        color: user.role?.toLowerCase() === 'admin' ? '#1e40af' : '#4338ca'
                                                    }}>
                                                        {user.role || 'user'}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>{user.createdAt}</td>
                                                <td style={tdStyle}>
                                                    <button
                                                        onClick={() => handleRejectClick(user.recordId, 'user')}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            backgroundColor: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontWeight: 600,
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        ✗ Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div style={{ background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>

                        {/* Date Filter Header */}
                        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <label style={{ fontWeight: 600, color: '#64748b' }}>Filter by Date:</label>
                            <input
                                type="date"
                                value={historyFilterDate}
                                onChange={(e) => setHistoryFilterDate(e.target.value)}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.9rem'
                                }}
                            />
                            {historyFilterDate && (
                                <button
                                    onClick={() => setHistoryFilterDate('')}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        color: '#3b82f6',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Clear Filter
                                </button>
                            )}
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
                                        <th style={thStyle}>Date</th>
                                        <th style={thStyle}>User</th>
                                        <th style={thStyle}>Session</th>
                                        <th style={thStyle}>Start Time</th>
                                        <th style={thStyle}>End Time</th>
                                        <th style={thStyle}>Work Description</th>
                                        <th style={thStyle}>Status</th>
                                        <th style={thStyle}>Approved By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingGlobal ? (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                Loading global history...
                                            </td>
                                        </tr>
                                    ) : filteredHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                {historyFilterDate ? `No records found for ${historyFilterDate}` : 'No history records found'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredHistory.map((item, idx) => (
                                            <tr key={item.recordId || idx} style={{ backgroundColor: idx % 2 === 0 ? '#f8fafc' : 'white' }}>
                                                <td style={tdStyle}>{item.date}</td>
                                                <td style={tdStyle} >
                                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.userName}</span>
                                                </td>
                                                <td style={tdStyle}>{item.sessionNo}</td>
                                                <td style={tdStyle}>{item.startTime}</td>
                                                <td style={tdStyle}>{item.endTime}</td>
                                                <td style={tdStyle} title={item.workDescription}>
                                                    {item.workDescription ? (item.workDescription.length > 40 ? item.workDescription.substring(0, 40) + '...' : item.workDescription) : '-'}
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '20px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        backgroundColor: item.status === 'Completed' ? '#dcfce7' : '#fef3c7',
                                                        color: item.status === 'Completed' ? '#166534' : '#b45309'
                                                    }}>
                                                        {item.status || 'Pending'}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>{item.approvedBy || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Custom Reject Confirmation Modal */}
            {rejectModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        width: '400px',
                        boxShadow: 'var(--shadow-lg)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>Reject Request?</h2>
                        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                            Are you sure you want to delete this {deleteType === 'user' ? 'user' : 'request'}? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                onClick={() => setRejectModalOpen(false)}
                                disabled={rejecting !== null}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: 'white',
                                    color: '#64748b',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={rejecting !== null}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: rejecting !== null ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {rejecting !== null ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {addUserModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        width: '400px',
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        <h2 style={{ margin: '0 0 1.5rem 0', color: '#1e293b' }}>Add New User</h2>
                        <form onSubmit={handleAddUser}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Password</label>
                                <input
                                    type="password"
                                    required
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem'
                                    }}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setAddUserModalOpen(false)}
                                    disabled={newUserLoading}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: 'white',
                                        color: '#64748b',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={newUserLoading}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: newUserLoading ? 'wait' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {newUserLoading ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Stat Card Component
const StatCard = ({ title, value, color, icon }) => (
    <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden'
    }}>
        <div style={{
            position: 'absolute',
            right: '-10px',
            top: '-10px',
            fontSize: '4rem',
            opacity: 0.1
        }}>
            {icon}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
        </div>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: color, marginTop: '0.5rem' }}>
            {value}
        </div>
    </div>
);

// Tab Button Component
const TabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        style={{
            padding: '1rem 1.5rem',
            border: 'none',
            background: 'transparent',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            color: active ? '#1e40af' : 'var(--text-secondary)',
            borderBottom: active ? '3px solid #1e40af' : '3px solid transparent',
            transition: 'all 0.2s'
        }}
    >
        {children}
    </button>
);

// Table Styles
const thStyle = {
    textAlign: 'left',
    padding: '1rem',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 700
};

const tdStyle = {
    padding: '1rem',
    fontSize: '0.9rem',
    borderBottom: '1px solid #e2e8f0'
};

export default AdminDashboard;
