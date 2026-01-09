import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { fetchAuthData } from '../../api';
import {
    LogOut
} from 'lucide-react';
import logo from '../../assets/logo.png';

const AdminLayout = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Shared State to avoid refetching on every tab switch
    const [requests, setRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchAuthData();
            setRequests(data.sessions || []);
            setUsers(data.users || []);
            setAttendance(data.attendance || []);
        } catch (error) {
            console.error('Failed to load admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Helper to refresh data after actions (approve/delete)
    const refreshData = () => {
        loadData();
    };

    // Manually update local state if we want optimistic UI without full refresh
    const updateRequests = (newRequests) => setRequests(newRequests);
    const updateUsers = (newUsers) => setUsers(newUsers);

    // Calculate Stats for Sidebar/Header
    const stats = {
        pendingRequests: requests.filter(r => r.approvedState?.toLowerCase() === 'pending').length
    };



    return (
        <div className="admin-container">
            {/* Header */}
            <header className="admin-header">
                {/* Left: Navigation */}
                <nav className="header-nav" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <NavLink
                        to="/admin/requests"
                        className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="nav-text">Requests</span>
                            {stats.pendingRequests > 0 && (
                                <span className="badge badge-pending" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                                    {stats.pendingRequests}
                                </span>
                            )}
                        </div>
                    </NavLink>
                    <NavLink
                        to="/admin/users"
                        className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="nav-text">Users</span>
                        </div>
                    </NavLink>
                    <NavLink
                        to="/admin/attendance"
                        className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="nav-text">Attendance</span>
                        </div>
                    </NavLink>
                    <NavLink
                        to="/admin/history"
                        className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="nav-text">History</span>
                        </div>
                    </NavLink>
                </nav>

                {/* Center: Title (Clickable Dashboard Link) */}
                <div className="admin-title" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap'
                }}>
                    <NavLink to="/admin" end style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontFamily: '"Croissant One", serif', fontWeight: 'bold', fontSize: '1.5rem' }}>Hope3-Services</span>
                    </NavLink>
                </div>

                {/* Right: Logout */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onLogout} className="btn btn-danger">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            <main className="admin-main">
                {/* Content Area */}
                <div className="content-card">
                    {/* Pass shared state and methods to children */}
                    <Outlet context={{
                        requests,
                        users,
                        attendance,
                        loading,
                        refreshData,
                        updateRequests,
                        updateUsers
                    }} />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
