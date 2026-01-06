
import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import TimerCard from './TimerCard';
import HistoryGrid from './HistoryGrid';
import EndSessionModal from './EndSessionModal';
import EditSessionModal from './EditSessionModal';
import StatsCard from './StatsCard';
import { fetchData, createRecord, updateRecord } from '../api';
import UserNameModal from './UserNameModal';



const TrackerApp = () => {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [isEndModalOpen, setIsEndModalOpen] = useState(false);
    const [todayStats, setTodayStats] = useState({ seconds: 0, count: 0 });

    // User State
    const [userName, setUserName] = useState(localStorage.getItem('appUserName') || '');
    const [isUserModalOpen, setIsUserModalOpen] = useState(!localStorage.getItem('appUserName'));

    // Edit Modal State
    const [editSession, setEditSession] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // 1. Initial Load & Calculate Stats
    useEffect(() => {
        if (!userName) {
            setIsUserModalOpen(true);
        }
        loadData();
        // Check local storage for active session
        const storedSession = localStorage.getItem('activeWorkSession');
        if (storedSession) {
            try {
                setActiveSession(JSON.parse(storedSession));
            } catch (e) {
                console.error("Error parsing local session", e);
                localStorage.removeItem('activeWorkSession');
            }
        }
    }, [userName]); // Reload if username changes

    // 2. Recalculate Stats when sessions change
    useEffect(() => {
        // Construct System Date "YYYY-MM-DD"
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // Safely check s.date with Timezone Parse
        const todaySessions = sessions.filter(s => {
            if (!s.date) return false;
            let d = new Date(s.date);
            if (isNaN(d.getTime())) return false; // Invalid date

            // Check formatted local string
            const sYear = d.getFullYear();
            const sMonth = String(d.getMonth() + 1).padStart(2, '0');
            const sDay = String(d.getDate()).padStart(2, '0');
            const sDateStr = `${sYear}-${sMonth}-${sDay}`;

            return sDateStr === todayStr;
        });

        let totalSec = 0;
        todaySessions.forEach(s => {
            totalSec += parseDurationString(s.duration);
        });

        setTodayStats({
            seconds: totalSec,
            count: todaySessions.length
        });
    }, [sessions]);

    const loadData = async () => {
        if (!userName) return; // Don't load if no user
        setLoading(true);
        try {
            const data = await fetchData();

            // Filter: Current User AND Matches Today's Date (Strict Manual System Date)
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            console.log("System Date Filter:", todayStr);

            const mySessions = data.filter(s => {
                // Ensure we filter by the correct user name (now fixed in API)
                if (s.userName !== userName) return false;
                if (!s.date) return false;

                // Robust Match: Handle "2026-01-06" OR "2026-01-06T..." -> "2026-01-06"
                const recordDateStr = String(s.date).split('T')[0];
                return recordDateStr === todayStr;
            });

            console.log("All Data:", data.length);
            console.log("Today Data:", mySessions.length);

            setSessions(mySessions);
        } catch (e) {
            console.error("Failed to load", e);
        } finally {
            setLoading(false);
        }
    };

    // 3. Start Work
    const handleStartWork = async () => {
        if (!userName) {
            setIsUserModalOpen(true);
            return;
        }

        const now = new Date();
        // USE LOCAL DATE
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const timeStr = now.toTimeString().slice(0, 5); // HH:MM

        // Calculate Next Session Number for TODAY
        // Filter mySessions for today's records specifically (Robust Match)
        const sessionsToday = sessions.filter(s => s.date && String(s.date).includes(dateStr));

        let nextSessionNo = 1;
        if (sessionsToday.length > 0) {
            // Find max session number to avoid duplicates if rows were deleted
            const sessionNums = sessionsToday.map(s => parseInt(s.sessionNo) || 0);
            const maxSession = Math.max(...sessionNums);
            nextSessionNo = maxSession + 1;
        }

        const newLocalSession = {
            date: dateStr,
            userName: userName,
            sessionNo: nextSessionNo.toString(),
            startTime: timeStr,
            startTimeFull: now.toISOString(), // Store full ISO
            status: 'In Progress'
        };

        setActiveSession(newLocalSession);
        localStorage.setItem('activeWorkSession', JSON.stringify(newLocalSession));
    };

    // 4. End Work
    const handleEndClick = () => {
        setIsEndModalOpen(true);
    };

    // 5. Submit End Modal
    const handleFinishSession = async (modalData) => {
        if (!activeSession) return;

        const now = new Date();
        const endTimeStr = now.toTimeString().slice(0, 5); // HH:MM

        // Calculate duration in SECONDS
        let durationSeconds = 0;
        if (activeSession.startTimeFull) {
            const start = new Date(activeSession.startTimeFull);
            const diffMs = now - start;
            durationSeconds = Math.floor(diffMs / 1000);
        } else if (activeSession.startTime) {
            const today = new Date().toISOString().slice(0, 10);
            const start = new Date(`${today}T${activeSession.startTime}:00`);
            const end = new Date(`${today}T${endTimeStr}:00`);
            durationSeconds = Math.floor((end - start) / 1000);
        }

        if (durationSeconds < 0) durationSeconds = 0;

        const durationStr = formatDurationString(durationSeconds);

        const finalPayload = {
            date: activeSession.date,
            userName: activeSession.userName,
            sessionNo: activeSession.sessionNo,
            startTime: activeSession.startTime,
            endTime: endTimeStr,
            duration: durationStr,
            workDescription: modalData.workDescription,
            project: modalData.project,
            category: modalData.category,
            status: 'Completed',
            approvedState: 'Pending',
            approvedBy: ''
        };

        try {
            const res = await createRecord(finalPayload);
            setIsEndModalOpen(false);
            setActiveSession(null);
            localStorage.removeItem('activeWorkSession');

            // OPTIMISTIC UPDATE: Add to sessions immediately so "Start Work" sees it
            // This prevents the "Session 3 again" bug if Google Sheets is slow
            const newOptimisticRecord = {
                ...finalPayload,
                recordId: res.recordId || Date.now(), // Use returned ID or temp
                status: 'Completed' // Ensure status is set
            };

            setSessions(prev => [newOptimisticRecord, ...prev]);

            // Still reload in background to confirm
            setTimeout(loadData, 1000);
        } catch (e) {
            alert("Error ending session: " + e.message);
        }
    };


    // 6. Action Handlers
    const handleEditClick = (session) => {
        setEditSession(session);
        setIsEditModalOpen(true);
    };

    const handleUpdateConfirm = async (updatedData) => {
        try {
            await updateRecord(updatedData);
            setEditSession(null);
            setIsEditModalOpen(false);
            // Refresh
            setTimeout(loadData, 1000);
        } catch (e) {
            alert("Error updating: " + e.message);
        }
    };

    const handleDeleteConfirm = async (recordId) => {
        try {
            await deleteRecord(recordId);
            setEditSession(null);
            setIsEditModalOpen(false);
            setTimeout(loadData, 1000);
        } catch (e) {
            alert("Error deleting: " + e.message);
        }
    };

    const handleSaveUser = (name) => {
        setUserName(name);
        localStorage.setItem('appUserName', name);
        setIsUserModalOpen(false);
    };

    // View State
    const [currentView, setCurrentView] = useState('tracker');
    const [systemDate, setSystemDate] = useState('');

    useEffect(() => {
        // Set formatted system date for display
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        setSystemDate(now.toLocaleDateString(undefined, options));
    }, []);

    return (
        <DashboardLayout
            userProfile={{ name: userName || 'Guest', role: 'Developer' }}
            onEditProfile={() => setIsUserModalOpen(true)}
        >
            <div className="fade-in-entry">
                {/* Navigation / Header Area */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    {/* System Date Display */}
                    <div style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <span style={{ color: 'var(--accent-color)' }}>📅</span>
                        {systemDate}
                    </div>

                    {currentView === 'tracker' ? (
                        <button
                            onClick={() => setCurrentView('history')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                boxShadow: 'var(--shadow-md)'
                            }}
                        >
                            <span>View History ➜</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setCurrentView('tracker')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'white',
                                color: 'var(--text-primary)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <span>← Back to Tracker</span>
                        </button>
                    )}
                </div>

                {/* TRACKER VIEW */}
                {currentView === 'tracker' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'stretch' }}>
                        <TimerCard
                            activeSession={activeSession}
                            onStart={handleStartWork}
                            onEnd={handleEndClick}
                        />
                        <StatsCard
                            totalSeconds={todayStats.seconds}
                            sessionCount={todayStats.count}
                        />
                    </div>
                )}

                {/* HISTORY VIEW */}
                {currentView === 'history' && (
                    <HistoryGrid
                        sessions={sessions}
                        onEdit={handleEditClick}
                    />
                )}
            </div>

            <EndSessionModal
                isOpen={isEndModalOpen}
                onClose={() => setIsEndModalOpen(false)}
                onSubmit={handleFinishSession}
            />

            <EditSessionModal
                isOpen={isEditModalOpen}
                session={editSession}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleUpdateConfirm}
                onDelete={handleDeleteConfirm}
            />

            <UserNameModal
                isOpen={isUserModalOpen}
                currentName={userName}
                onSave={handleSaveUser}
                onClose={() => userName && setIsUserModalOpen(false)} // Only allow close if name exists
            />
        </DashboardLayout>
    );
};

// Helper to parse "1 hr 30 mins 20 sec"
const parseDurationString = (input) => {
    if (!input) return 0;
    // Force to string to prevent "match is not a function" error if input is a number/object
    const str = String(input);

    let sec = 0;
    const h = str.match(/(\d+)\s*hr/);
    const m = str.match(/(\d+)\s*mins?/);
    const s = str.match(/(\d+)\s*sec/);

    if (h) sec += parseInt(h[1]) * 3600;
    if (m) sec += parseInt(m[1]) * 60;
    if (s) sec += parseInt(s[1]);

    // Fallback: if no text match but it is a non-zero number, treat as minutes (legacy support)
    // Only if sec is 0 and parseFloat works
    if (sec === 0) {
        const floatVal = parseFloat(str);
        if (!isNaN(floatVal) && floatVal > 0) {
            sec = Math.floor(floatVal * 60);
        }
    }

    return sec;
};

// Helper: "1 hr 30 mins 45 sec"
const formatDurationString = (totalSeconds) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '0 sec';

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    let parts = [];
    if (h > 0) parts.push(`${h} hr`);
    if (m > 0) parts.push(`${m} mins`);
    if (s > 0 || parts.length === 0) parts.push(`${s} sec`);

    return parts.join(' ');
};

export default TrackerApp;

