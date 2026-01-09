import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { fetchAuthData } from '../../api';
import {
    LogOut
} from 'lucide-react';
import logo from '../../assets/logo.png';

const AdminLayout = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const logoutRef = useRef(null);

    // Shared State to avoid refetching on every tab switch
    const [requests, setRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLogout, setShowLogout] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (logoutRef.current && !logoutRef.current.contains(event.target)) {
                setShowLogout(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        <div className="h-screen bg-bg-main font-sans flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-transparent px-8 py-4 grid grid-cols-[1fr_auto_1fr] items-center z-50 shrink-0">
                {/* Left: Navigation */}
                <nav className="flex gap-1 items-center">
                    <NavLink
                        to="/admin/requests"
                        className={({ isActive }) =>
                            `inline-flex items-center px-5 py-2.5 rounded-full text-[0.95rem] font-montserrat transition-all duration-200 no-underline
                            ${isActive ? 'text-primary border border-primary font-bold' : 'text-primary border border-transparent hover:border-slate-300 font-normal'}`
                        }
                    >
                        <div className="flex items-center gap-1.5 no-underline text-inherit">
                            <span>Requests</span>
                            {stats.pendingRequests > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[0.7rem] font-semibold leading-none bg-warning-bg text-amber-700">
                                    {stats.pendingRequests}
                                </span>
                            )}
                        </div>
                    </NavLink>
                    <NavLink
                        to="/admin/users"
                        className={({ isActive }) =>
                            `inline-flex items-center px-5 py-2.5 rounded-full text-[0.95rem] font-montserrat transition-all duration-200 no-underline
                            ${isActive ? 'text-primary border border-primary font-bold' : 'text-primary border border-transparent hover:border-slate-300 font-normal'}`
                        }
                    >
                        <div className="flex items-center gap-1.5 no-underline text-inherit">
                            <span>Users</span>
                        </div>
                    </NavLink>
                    <NavLink
                        to="/admin/attendance"
                        className={({ isActive }) =>
                            `inline-flex items-center px-5 py-2.5 rounded-full text-[0.95rem] font-montserrat transition-all duration-200 no-underline
                            ${isActive ? 'text-primary border border-primary font-bold' : 'text-primary border border-transparent hover:border-slate-300 font-normal'}`
                        }
                    >
                        <div className="flex items-center gap-1.5 no-underline text-inherit">
                            <span>Attendance</span>
                        </div>
                    </NavLink>
                    <NavLink
                        to="/admin/history"
                        className={({ isActive }) =>
                            `inline-flex items-center px-5 py-2.5 rounded-full text-[0.95rem] font-montserrat transition-all duration-200 no-underline
                            ${isActive ? 'text-primary border border-primary font-bold' : 'text-primary border border-transparent hover:border-slate-300 font-normal'}`
                        }
                    >
                        <div className="flex items-center gap-1.5 no-underline text-inherit">
                            <span>History</span>
                        </div>
                    </NavLink>
                </nav>

                {/* Center: Title (Clickable Dashboard Link) */}
                <div className="flex items-center gap-4 justify-center whitespace-nowrap">
                    <NavLink to="/admin" end className="no-underline text-inherit flex items-center">
                        <span className="font-['Croissant_One'] font-bold text-2xl">Hope3-Services</span>
                    </NavLink>
                </div>

                {/* Right: Profile/Logo Toggle */}
                <div className="flex justify-end relative" ref={logoutRef}>
                    <button
                        onClick={() => setShowLogout(!showLogout)}
                        className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all cursor-pointer bg-white shadow-sm flex items-center justify-center p-0
                            ${showLogout ? 'border-primary ring-4 ring-primary/5 scale-95' : 'border-primary/10 hover:border-primary/30'}`}
                    >
                    </button>

                    {showLogout && (
                        <div className="absolute top-12 right-0 bg-white rounded-xl shadow-xl border border-border-main p-1 z-[100] animate-in fade-in zoom-in-95 slide-in-from-right-4 duration-300 min-w-[160px]">
                            <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Account</span>
                            </div>
                            <button
                                onClick={() => {
                                    setShowLogout(false);
                                    onLogout();
                                }}
                                className="w-full inline-flex items-center gap-3 px-3 py-2.5 text-danger hover:bg-red-50 text-[0.85rem] font-bold rounded-lg transition-all cursor-pointer border-none bg-transparent"
                            >
                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                                    <LogOut size={16} />
                                </div>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 w-full m-0 px-8 pb-8 pt-4 flex flex-col gap-4 overflow-hidden">
                {/* Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-transparent rounded-none border-none shadow-none">
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
