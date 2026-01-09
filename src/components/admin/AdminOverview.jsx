import React from 'react';
import { useOutletContext, NavLink } from 'react-router-dom';
import { Clock, Users, ExternalLink, Calendar, UserCheck, ArrowUpRight, Shield, Activity, Layout, Layers } from 'lucide-react';

const AdminOverview = () => {
    const { requests, users, attendance } = useOutletContext();

    // Today's date logic
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const todayAttendance = (attendance || []).filter(item => {
        if (!item.date) return false;
        let dStr = item.date;
        if (dStr.includes('T')) dStr = dStr.split('T')[0];
        return dStr === todayStr;
    });

    const stats = {
        pendingRequests: requests.filter(r => r.approvedState?.toLowerCase() === 'pending').length,
        totalUsers: users.length,
        adminUsers: users.filter(u => u.role?.toLowerCase() === 'admin').length,
        regularUsers: users.filter(u => u.role?.toLowerCase() !== 'admin').length,
        todayPresent: todayAttendance.length
    };

    const sheetUrl1 = import.meta.env.VITE_GOOGLE_SHEET_URL_1 || '#';
    const sheetUrl2 = import.meta.env.VITE_GOOGLE_SHEET_URL_2 || '#';

    return (
        <div className="flex h-full bg-[#fcfcfd] text-[#1a1a1a] overflow-hidden rounded-3xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] border border-[#f0f0f5]">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto gap-6">
                {/* Hero Greeting */}
                <div className="bg-gradient-to-br from-[#0a0a0b] to-[#1e1e2d] rounded-3xl py-6 px-8 text-white flex justify-between items-center relative overflow-hidden shadow-xl shrink-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_70%)] pointer-events-none -top-1/2 -left-[20%] w-full h-[200%]"></div>
                    <div className="relative z-10 flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                            <span className="bg-white/10 px-3 py-1 rounded-full text-[0.75rem] font-bold uppercase tracking-widest backdrop-blur-md border border-white/10">Management Control</span>
                            <span className="text-[0.85rem] opacity-60 font-medium">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight">System Intelligence Dashboard</h1>
                        <p className="text-base opacity-70 max-w-[450px] leading-relaxed">
                            Efficiency tracking and administrative control at your fingertips.
                        </p>
                    </div>
                    <div className="relative opacity-20 hidden md:block">
                        <Activity size={120} className="animate-float" />
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 shrink-0">
                    <div className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-4 border border-[#f0f0f5] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group">
                        <div className="flex justify-between items-center">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-500"><Clock size={20} /></div>
                            <NavLink to="/admin/requests" className="text-slate-400 hover:text-slate-800 transition-colors"><ArrowUpRight size={16} /></NavLink>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[0.85rem] font-semibold text-slate-500 mb-1">Pending Approval</span>
                            <span className="text-3xl font-extrabold text-slate-900 leading-none">{stats.pendingRequests}</span>
                        </div>
                        <div className="mt-2">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-amber-500" style={{ width: '40%' }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-4 border border-[#f0f0f5] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group">
                        <div className="flex justify-between items-center">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-500"><Users size={20} /></div>
                            <NavLink to="/admin/users" className="text-slate-400 hover:text-slate-800 transition-colors"><ArrowUpRight size={16} /></NavLink>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[0.85rem] font-semibold text-slate-500 mb-1">Active Directory</span>
                            <span className="text-3xl font-extrabold text-slate-900 leading-none">{stats.totalUsers}</span>
                        </div>
                        <div className="mt-2">
                            <span className="text-[0.75rem] text-slate-400 font-medium">{stats.adminUsers} Privileged • {stats.regularUsers} Standard</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-4 border border-[#f0f0f5] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group">
                        <div className="flex justify-between items-center">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-500"><UserCheck size={20} /></div>
                            <NavLink to="/admin/attendance" className="text-slate-400 hover:text-slate-800 transition-colors"><ArrowUpRight size={16} /></NavLink>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[0.85rem] font-semibold text-slate-500 mb-1">Deployment Today</span>
                            <span className="text-3xl font-extrabold text-slate-900 leading-none">{stats.todayPresent}</span>
                        </div>
                        <div className="mt-2">
                            <span className="text-[0.85rem] font-semibold text-blue-500 uppercase tracking-wider">Real-time Syncing</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Charts Placeholder & Sheets */}
                <div className="flex-1 flex min-h-0">
                    <div className="bg-white/70 backdrop-blur-md rounded-[24px] flex-1 flex flex-col overflow-hidden border border-[#f0f0f5]">
                        <div className="px-6 py-3 border-b border-slate-100 flex items-center">
                            <h3 className="m-0 text-sm font-bold text-slate-900 flex items-center gap-2"><Layout size={16} /> Administrative Quick-Access</h3>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                                <a href={sheetUrl1} target="_blank" rel="noopener noreferrer" className="flex flex-col items-start p-4 bg-white border border-slate-100 rounded-2xl text-slate-700 no-underline gap-2 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 shadow-sm">
                                    <ExternalLink size={18} className="text-blue-500" />
                                    <span className="font-semibold text-[0.85rem]">Data Sheet</span>
                                </a>
                                <a href={sheetUrl2} target="_blank" rel="noopener noreferrer" className="flex flex-col items-start p-4 bg-white border border-slate-100 rounded-2xl text-slate-700 no-underline gap-2 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 shadow-sm">
                                    <ExternalLink size={18} className="text-blue-500" />
                                    <span className="font-semibold text-[0.85rem]">Auth Sheet</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Side Sidebar Area */}
            <div className="w-72 bg-white border-l border-[#f0f0f5] flex flex-col p-4 shrink-0">
                <div className="bg-white rounded-[24px] flex-1 flex flex-col overflow-hidden border border-[#f0f0f5] shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="m-0 text-sm font-bold text-slate-900 flex items-center gap-2"><Calendar size={16} /> Live Feed</h3>
                        <span className="bg-red-100 text-red-500 text-[0.6rem] font-extrabold px-2 py-0.5 rounded uppercase tracking-widest">LIVE</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                        {todayAttendance.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 text-center p-6">
                                <Activity size={24} opacity={0.3} />
                                <p className="m-0 text-[0.8rem]">No active sessions.</p>
                            </div>
                        ) : (
                            todayAttendance.map((record, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl transition-colors hover:bg-slate-50">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-base shrink-0">
                                        {(record.user || record.userName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="font-semibold text-[0.85rem] text-slate-800 truncate">{record.user || record.userName}</span>
                                        <span className="text-[0.7rem] text-slate-400">{record.totalDuration || 'Pending...'}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;
