
import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import TimerCard from './TimerCard';
import HistoryGrid from './HistoryGrid';
import EndSessionModal from './EndSessionModal';
import EditSessionModal from './EditSessionModal';
import StatsCard from './StatsCard';
import { fetchData, createRecord, updateRecord } from '../api';

const CURRENT_USER = 'Jeevith';

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
            // Heuristic: If < 10, maybe hours? If > 10, maybe minutes? 
            // Let's assume minutes for safety as that was previous default
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

const TrackerApp = () => {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [isEndModalOpen, setIsEndModalOpen] = useState(false);
    const [todayStats, setTodayStats] = useState({ seconds: 0, count: 0 });

    // Edit Modal State
    const [editSession, setEditSession] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // 1. Initial Load & Calculate Stats
    useEffect(() => {
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
    }, []);

    // 2. Recalculate Stats when sessions change
    useEffect(() => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const todaySessions = sessions.filter(s => s.date && s.date.includes(todayStr));

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
        setLoading(true);
        try {
            const data = await fetchData();

            // Get today's components
            const today = new Date();
            const tYear = today.getFullYear();
            const tMonth = today.getMonth();
            const tDay = today.getDate();

            // Filter: Current User AND Matches Today's Date (Component Check)
            const myTodaySessions = data.filter(s => {
                if (s.userName !== CURRENT_USER) return false;
                if (!s.date) return false;

                // Create date object from record
                const recDate = new Date(s.date);
                if (isNaN(recDate.getTime())) return false; // Invalid date

                // Compare Y/M/D
                return recDate.getFullYear() === tYear &&
                    recDate.getMonth() === tMonth &&
                    recDate.getDate() === tDay;
            });

            console.log("All Data:", data.length);
            console.log("Filtered Data:", myTodaySessions.length);

            setSessions(myTodaySessions);
        } catch (e) {
            console.error("Failed to load", e);
        } finally {
            setLoading(false);
        }
    };

    // 3. Start Work
    const handleStartWork = async () => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 5); // HH:MM

        const todaySessions = sessions.filter(s => {
            if (!s.date) return false;
            return s.date.includes(dateStr);
        });
        const nextSessionNo = todaySessions.length + 1;

        const newLocalSession = {
            date: dateStr,
            userName: CURRENT_USER,
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
            await createRecord(finalPayload);
            setIsEndModalOpen(false);
            setActiveSession(null);
            localStorage.removeItem('activeWorkSession');
            setTimeout(loadData, 1000);
        } catch (e) {
            alert("Error ending session: " + e.message);
        }
    };


    if (loading && sessions.length === 0) {
        return (
            <DashboardLayout>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: '60vh', gap: '1rem'
                }}>
                    <div className="loading-spinner"></div>
                    <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Syncing Timeline...</div>
                </div>
            </DashboardLayout>
        );
    }


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

    return (
        <DashboardLayout>
            <div className="fade-in-entry">
                {/* Top Section: Grid */}
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

                {/* History Grid */}
                <HistoryGrid
                    sessions={sessions}
                    onEdit={handleEditClick}
                />
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
        </DashboardLayout>
    );
};

export default TrackerApp;
