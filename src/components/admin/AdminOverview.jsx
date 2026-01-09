import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Clock, Users, ExternalLink } from 'lucide-react';

const AdminOverview = () => {
    const { requests, users } = useOutletContext();

    const stats = {
        totalRequests: requests.length,
        pendingRequests: requests.filter(r => r.approvedState?.toLowerCase() === 'pending').length,
        totalUsers: users.length,
        adminUsers: users.filter(u => u.role?.toLowerCase() === 'admin').length,
        regularUsers: users.filter(u => u.role?.toLowerCase() !== 'admin').length
    };

    // Google Sheet URL from environment variable
    const sheetUrl = import.meta.env.VITE_GOOGLE_SHEET_URL || '#';

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <div className="dashboard-overview">
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>Dashboard Overview</h2>
                    <p>{getGreeting()}, Admin. Here's your summary.</p>
                </div>
                <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        textDecoration: 'none',
                        borderRadius: '2rem',
                        padding: '0.6rem 1.25rem'
                    }}
                >
                    <ExternalLink size={18} />
                    View Sheet
                </a>
            </div>

            <div className="dashboard-stats-grid">
                {/* Pending Requests */}
                <div className="dashboard-stat-card warning">
                    <div className="dashboard-stat-icon-watermark">
                        <Clock size={100} />
                    </div>
                    <div className="dashboard-stat-content">
                        <div className="dashboard-stat-icon-small" style={{ background: 'var(--warning-bg)', color: 'var(--warning-color)' }}>
                            <Clock size={24} />
                        </div>
                        <div className="dashboard-stat-label">Pending Requests</div>
                        <div className="dashboard-stat-value">{stats.pendingRequests}</div>
                    </div>
                </div>

                {/* Total Users */}
                <div className="dashboard-stat-card success">
                    <div className="dashboard-stat-icon-watermark">
                        <Users size={100} />
                    </div>
                    <div className="dashboard-stat-content">
                        <div className="dashboard-stat-icon-small" style={{ background: 'var(--success-bg)', color: 'var(--success-color)' }}>
                            <Users size={24} />
                        </div>
                        <div className="dashboard-stat-label">Total Users</div>
                        <div className="dashboard-stat-value">{stats.totalUsers}</div>
                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--success-color)' }}>
                                <strong>{stats.regularUsers}</strong> Users
                            </span>
                            <span style={{ color: '#8b5cf6' }}>
                                <strong>{stats.adminUsers}</strong> Admins
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;
