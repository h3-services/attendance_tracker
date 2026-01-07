
import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import TimerCard from './TimerCard';
import HistoryGrid from './HistoryGrid';
import EndSessionModal from './EndSessionModal';
import EditSessionModal from './EditSessionModal';
import StatsCard from './StatsCard';
import { fetchData, createRecord, updateRecord, deleteRecord } from '../api';
import LoginPage from './LoginPage';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import LogoutConfirmationModal from './LogoutConfirmationModal';
import CheckInModal from './CheckInModal';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

const TrackerApp = () => {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [isEndModalOpen, setIsEndModalOpen] = useState(false);
    const [todayStats, setTodayStats] = useState({ seconds: 0, count: 0 });

    // User State
    const [userName, setUserName] = useState(localStorage.getItem('appUserName') || '');
    const [userEmail, setUserEmail] = useState(localStorage.getItem('appUserEmail') || '');

    // Edit Modal State
    const [editSession, setEditSession] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    // Logout Modal State
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    // Notification State
    const [reminderInterval, setReminderInterval] = useState(() => {
        const saved = localStorage.getItem('reminderInterval');
        return saved ? parseInt(saved) : 0;
    }); // Default Never or Saved
    const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

    // Save Reminder Preference
    useEffect(() => {
        localStorage.setItem('reminderInterval', reminderInterval);
    }, [reminderInterval]);

    // Permission Request
    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }, []);

    // Reminder Polling
    useEffect(() => {
        if (!activeSession || activeSession.status !== 'In Progress' || reminderInterval <= 0 || isEndModalOpen) return;

        const checkReminder = () => {
            const now = new Date();
            // Store `lastReminderTime` in session.
            const baseTimeStr = activeSession.lastReminderTime || activeSession.startTimeFull || activeSession.startTimeStr;
            const baseTime = new Date(baseTimeStr);

            // If invalid, skip
            if (isNaN(baseTime.getTime())) return;

            if (activeSession.status === 'Paused' || isEndModalOpen) return;

            const elapsedSeconds = (now - baseTime) / 1000;

            if (elapsedSeconds >= reminderInterval) {
                // TRIGGER NOTIFICATION
                sendNotification();

                // Update lastReminderTime immediately prevent loop
                updateSessionReminderTime();
            }
        };

        // 1. Run IMMEDIATELY on load/state change (The "Catch-up" Fix)
        checkReminder();

        // 2. High Precision Polling (Every 1 second)
        const interval = setInterval(checkReminder, 1000);

        return () => clearInterval(interval);
    }, [activeSession, reminderInterval, isEndModalOpen]);

    const sendNotification = () => {
        // Format time string
        const h = Math.floor(reminderInterval / 3600);
        const m = Math.floor((reminderInterval % 3600) / 60);
        const s = reminderInterval % 60;
        let timeText = '';
        if (h > 0) timeText += `${h}h `;
        if (m > 0) timeText += `${m}m `;
        if (s > 0 || timeText === '') timeText += `${s}s`;

        if (Notification.permission === 'granted') {
            const n = new Notification("Still working?", {
                body: `You've been active for ${timeText.trim()}. Click to check in.`,
                icon: `${import.meta.env.BASE_URL}favicon.ico`, // optional
                tag: 'check-in' // prevent duplicates
            });
            n.onclick = () => {
                window.focus();
                setIsCheckInModalOpen(true);
                n.close();
            };
        }
        // Also fallback to open modal if they are looking at screen
        setIsCheckInModalOpen(true);
    };

    const updateSessionReminderTime = () => {
        if (!activeSession) return;
        const updated = {
            ...activeSession,
            lastReminderTime: new Date().toISOString()
        };
        setActiveSession(updated);
        localStorage.setItem('activeWorkSession', JSON.stringify(updated));
    };

    // 1. Initial Load & Calculate Stats
    useEffect(() => {
        if (userName) {
            loadData();
        }

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
        if (!userName) return;



        setLoading(true);
        try {
            // Filter: Current User AND Matches Today's Date (Strict Manual System Date)
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            console.log("Fetching Data for:", { userName, date: todayStr });

            // Pass filters to backend API
            const data = await fetchData({
                userName: userName,
                date: todayStr
            });

            // Backend now handles the filtering, so we can use data directly.
            // But we still apply a safety filter just in case the backend code 
            // wasn't updated/deployed yet, to prevent showing wrong data.
            const mySessions = data.filter(s => {
                if (s.userName && s.userName !== userName) return false;
                // Note: We don't strictly filter date here to allow for slight timezone diffs 
                // if backend returns them, but ideally backend handles it.
                return true;
            });

            console.log("Sessions Loaded:", mySessions.length);
            setSessions(mySessions);
        } catch (e) {
            console.error("Failed to load", e);
        } finally {
            setLoading(false);
        }
    };

    // 3. Start Work
    const handleStartWork = async (customStartTime = null) => {
        if (!userName) {
            setIsUserModalOpen(true);
            return;
        }

        const now = new Date();
        const start = customStartTime || now;

        // USE LOCAL DATE
        const year = start.getFullYear();
        const month = String(start.getMonth() + 1).padStart(2, '0');
        const day = String(start.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const timeStr = start.toTimeString().slice(0, 5); // HH:MM

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
            startTime: timeStr,
            startTimeFull: start.toISOString(), // Store full ISO
            status: 'In Progress',
            totalPausedSeconds: 0,
            lastPauseTime: null,
            lastReminderTime: start.toISOString(), // Initialize reminder baseline
            reminderInterval: reminderInterval // Store preference in session for persistence if needed, but we use local state for now
        };


        setActiveSession(newLocalSession);
        localStorage.setItem('activeWorkSession', JSON.stringify(newLocalSession));
    };

    // 4. Pause Work
    const handlePauseWork = () => {
        if (!activeSession) return;
        const updatedSession = {
            ...activeSession,
            lastPauseTime: new Date().toISOString(),
            status: 'Paused'
        };
        setActiveSession(updatedSession);
        localStorage.setItem('activeWorkSession', JSON.stringify(updatedSession));
    };

    // 5. Resume Work
    const handleResumeWork = () => {
        if (!activeSession || !activeSession.lastPauseTime) return;

        const now = new Date();
        const pauseStart = new Date(activeSession.lastPauseTime);
        const pauseSeconds = Math.floor((now - pauseStart) / 1000);

        const updatedSession = {
            ...activeSession,
            lastPauseTime: null,
            totalPausedSeconds: (activeSession.totalPausedSeconds || 0) + pauseSeconds,
            status: 'In Progress'
        };
        setActiveSession(updatedSession);
        localStorage.setItem('activeWorkSession', JSON.stringify(updatedSession));
    };

    // 6. End Work
    const handleEndClick = () => {
        // If paused, we resume momentarily to calculate final correct duration or just end it?
        // Plan: If paused, the final "gap" is also pause time, not work time.
        // So we need to account for that in handleFinishSession.
        setIsEndModalOpen(true);
    };

    // 5. Submit End Modal
    const handleFinishSession = async (modalData) => {
        if (!activeSession) return;

        const now = new Date();
        const endTimeStr = now.toTimeString().slice(0, 5); // HH:MM

        // Parse Start Time
        let startDateObj = new Date();
        if (activeSession.startTimeFull) {
            startDateObj = new Date(activeSession.startTimeFull);
        } else {
            // Fallback for missing ISO
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            startDateObj = new Date(`${y}-${m}-${d}T${activeSession.startTime}:00`);
        }

        // Check for Overnight (Start Date != End Date)
        const sYear = startDateObj.getFullYear();
        const sMonth = String(startDateObj.getMonth() + 1).padStart(2, '0');
        const sDay = String(startDateObj.getDate()).padStart(2, '0');
        const startDateStr = `${sYear}-${sMonth}-${sDay}`;

        const eYear = now.getFullYear();
        const eMonth = String(now.getMonth() + 1).padStart(2, '0');
        const eDay = String(now.getDate()).padStart(2, '0');
        const endDateStr = `${eYear}-${eMonth}-${eDay}`;

        const isOvernight = startDateStr !== endDateStr;

        // Base Data
        const basePayload = {
            userName: activeSession.userName,
            workDescription: modalData.workDescription,
            project: modalData.project,
            category: modalData.category,
            status: modalData.status || 'Completed',
            approvedState: modalData.approvedState || 'Pending',
            approvedBy: ''
        };

        setIsEndModalOpen(false);
        setActiveSession(null);
        localStorage.removeItem('activeWorkSession');

        if (isOvernight) {
            console.log("Overnight Session Detected! Splitting...");

            // --- Part 1: Start -> 23:59 (Start Date) ---
            // Calculate duration: Start -> 23:59:59
            const endOfDay = new Date(startDateObj);
            endOfDay.setHours(23, 59, 59, 999);
            let dur1 = Math.floor((endOfDay - startDateObj) / 1000);
            if (dur1 < 0) dur1 = 0;

            const payload1 = {
                ...basePayload,
                date: startDateStr,
                sessionNo: activeSession.sessionNo,
                startTime: activeSession.startTime,
                endTime: '23:59',
                duration: formatDurationString(dur1)
            };

            // --- Part 2: 00:00 -> End (End Date) ---
            // Calculate duration: 00:00 -> Now
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            let dur2 = Math.floor((now - startOfDay) / 1000);
            if (dur2 < 0) dur2 = 0;

            // Determine Session No for Day 2
            // Since we might not have Day 2 loaded, we check if we have any sessions for endDateStr locally
            const nextDaySessions = sessions.filter(s => s.date === endDateStr);
            const nextDayNums = nextDaySessions.map(s => parseInt(s.sessionNo) || 0);
            const nextDayNo = nextDayNums.length > 0 ? Math.max(...nextDayNums) + 1 : 1;

            const payload2 = {
                ...basePayload,
                date: endDateStr,
                sessionNo: nextDayNo.toString(),
                startTime: '00:00',
                endTime: endTimeStr,
                duration: formatDurationString(dur2)
            };

            // Optimistic UI
            const t1 = Date.now();
            const t2 = t1 + 1;
            setSessions(prev => [
                { ...payload2, recordId: t2, status: 'Completed' },
                { ...payload1, recordId: t1, status: 'Completed' },
                ...prev
            ]);

            // Background Sync
            try {
                // Determine order? Usually FIFO or just parallel.
                await createRecord(payload1);
                await createRecord(payload2);
                loadData();
            } catch (e) {
                console.error("Overnight Save Error", e);
                alert("Saved locally, sync failed: " + e.message);
            }

        } else {

            // --- Standard Single Day ---
            let durationSeconds = Math.floor((now - startDateObj) / 1000);

            // Subtract previously accumulated pauses
            if (activeSession.totalPausedSeconds) {
                durationSeconds -= activeSession.totalPausedSeconds;
            }

            // If currently paused, subtract the current ongoing pause duration too
            // (Because that time from lastPauseTime -> Now is NOT work)
            if (activeSession.lastPauseTime) {
                const pauseStart = new Date(activeSession.lastPauseTime);
                const currentPauseDuration = Math.floor((now - pauseStart) / 1000);
                durationSeconds -= currentPauseDuration;
            }

            if (durationSeconds < 0) durationSeconds = 0;

            const finalPayload = {
                ...basePayload,
                date: startDateStr, // Robust date
                sessionNo: activeSession.sessionNo,
                startTime: activeSession.startTime,
                endTime: endTimeStr,
                duration: formatDurationString(durationSeconds)
            };

            // Optimistic
            const tempId = Date.now();
            setSessions(prev => [{ ...finalPayload, recordId: tempId, status: 'Completed' }, ...prev]);

            try {
                const res = await createRecord(finalPayload);
                if (res && res.recordId) {
                    setSessions(prev => prev.map(s => s.recordId === tempId ? { ...s, recordId: res.recordId } : s));
                }
                loadData();
            } catch (e) {
                console.error(e);
                alert("Sync Error: " + e.message);
            }
        }
    };


    // 6. Action Handlers
    const handleManualAdd = () => {
        // Create template for new session
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const timeStr = now.toTimeString().slice(0, 5);

        // Ideally calculate next session No, but for manual entry just use 'Auto' or last + 1 of today
        // We will just set it based on current 'sessions' state for today
        const sessionsToday = sessions.filter(s => s.date === dateStr);
        const sessionNums = sessionsToday.map(s => parseInt(s.sessionNo) || 0);
        const nextNo = sessionNums.length > 0 ? Math.max(...sessionNums) + 1 : 1;

        const newTemplate = {
            // No recordId => New
            date: dateStr,
            userName: userName,
            sessionNo: nextNo.toString(),
            startTime: timeStr,
            endTime: timeStr, // Default to 0 duration
            duration: '0 sec',
            workDescription: '',
            project: '',
            category: '',
            status: 'Completed',
            approvedState: 'Pending'
        };

        setEditSession(newTemplate);
        setIsEditModalOpen(true);
    };

    const handleEditClick = (session) => {
        setEditSession(session);
        setIsEditModalOpen(true);
    };

    const handleUpdateConfirm = async (formData) => {
        // Distinguish Create vs Update
        const isNew = !formData.recordId;

        // 1. Immediate UI Close
        setIsEditModalOpen(false);
        setEditSession(null);

        // Check for Overnight Manual Entry (Only for New Records to keep it simple)
        // Condition: EndTime < StartTime implies crossing midnight into next day
        const isOvernight = isNew && formData.endTime && formData.startTime && formData.endTime < formData.startTime;

        if (isOvernight) {
            // --- SPLIT LOGIC ---
            const dateStr = formData.date;

            // Part 1: Date 1, Start -> 23:59
            const dur1Sec = calculateDurationSeconds(formData.startTime, '23:59');
            const record1 = {
                ...formData,
                endTime: '23:59',
                duration: formatDurationString(dur1Sec),
                recordId: Date.now()
            };

            // Part 2: Date 2 (Next Day), 00:00 -> End
            const d = new Date(dateStr);
            d.setDate(d.getDate() + 1); // Next Day
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const nextDateStr = `${y}-${m}-${day}`;

            // Calc Session No for next day
            const nextDaySessions = sessions.filter(s => s.date === nextDateStr);
            const nextNums = nextDaySessions.map(s => parseInt(s.sessionNo) || 0);
            const nextNo = nextNums.length > 0 ? Math.max(...nextNums) + 1 : 1;

            const dur2Sec = calculateDurationSeconds('00:00', formData.endTime);
            const record2 = {
                ...formData,
                date: nextDateStr,
                sessionNo: nextNo.toString(),
                startTime: '00:00',
                endTime: formData.endTime,
                duration: formatDurationString(dur2Sec),
                recordId: Date.now() + 1
            };

            // Optimistic
            setSessions(prev => [record2, record1, ...prev]);

            try {
                await createRecord(record1);
                await createRecord(record2);
                loadData();
            } catch (e) {
                alert("Split save error: " + e.message);
                loadData();
            }

        } else if (isNew) {
            // --- STANDARD CREATE ---
            const tempId = Date.now();
            const newRecord = { ...formData, recordId: tempId, status: formData.status || 'Completed' };
            setSessions(prev => [newRecord, ...prev]);

            try {
                const res = await createRecord(formData);
                if (res && res.recordId) {
                    setSessions(prev => prev.map(s =>
                        s.recordId === tempId ? { ...s, recordId: res.recordId } : s
                    ));
                }
                loadData();
            } catch (e) {
                console.error(e);
                alert("Error creating record: " + e.message);
                loadData();
            }
        } else {
            // --- UPDATE (Edit) ---
            try {
                setSessions(prev => prev.map(s => s.recordId === formData.recordId ? formData : s));
                await updateRecord(formData);
                setTimeout(loadData, 500);
            } catch (e) {
                alert("Error updating: " + e.message);
                loadData();
            }
        }
    };

    // Internal helper for manual split duration
    const calculateDurationSeconds = (start, end) => {
        const today = new Date().toISOString().slice(0, 10);
        const s = new Date(`${today}T${start}:00`);
        const e = new Date(`${today}T${end}:00`);
        const diff = (e - s) / 1000;
        return diff > 0 ? diff : 0;
    };

    const initiateDelete = (recordId) => {
        setDeleteTargetId(recordId);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (!deleteTargetId) return;
        const recordId = deleteTargetId;

        // Find session to get date
        const sessionToDelete = sessions.find(s => s.recordId === recordId);
        if (!sessionToDelete) {
            console.error("Session not found for deletion");
            return;
        }

        // 1. OPTIMISTIC UI UPDATE

        // A. Close Modals Immediately
        setIsDeleteModalOpen(false);
        setEditSession(null);
        setIsEditModalOpen(false);

        // B. Update Local State Immediately (Remove item)
        // We also need to predict the renumbering locally for the best experience
        const otherSessions = sessions.filter(s => s.recordId !== recordId);

        // Simple renumber logic for optimistic state
        const sameDaySessions = otherSessions.filter(s => s.date === sessionToDelete.date);

        // Sort
        sameDaySessions.sort((a, b) => {
            if (!a.startTime || !b.startTime) return 0;
            return a.startTime.localeCompare(b.startTime);
        });

        // Apply new numbers locally
        const renumberedDaySessions = sameDaySessions.map((s, index) => ({
            ...s,
            sessionNo: (index + 1).toString()
        }));

        // Merge back into main list
        const finalOptimisticSessions = otherSessions.map(s => {
            if (s.date === sessionToDelete.date) {
                const updated = renumberedDaySessions.find(r => r.recordId === s.recordId);
                return updated || s;
            }
            return s;
        });

        setSessions(finalOptimisticSessions);


        // 2. BACKGROUND SYNC
        try {
            // Delete the target record
            await deleteRecord(recordId);

            // Renumber Logic: Find remaining sessions for the SAME DATE (From API perspective)
            // Note: We use the logic on the *original* session data context or fetched, 
            // but here we just need to ensure the backend is updated.

            // To be safe, let's use the local 'sessions' snapshot before delete 
            // (already captured in sessionToDelete and its date)
            // Actually, we can just process the updates based on optimization.

            // Re-fetch or use logic? 
            // Let's stick to the renumber logic we had, but run it in background.

            const updates = [];
            renumberedDaySessions.forEach(s => {
                // If the session number changed from what it was in the original 'sessions' state
                // We need to send update. 
                // We can check against the *original* sessions list to see if 'sessionNo' differs.
                const original = sessions.find(os => os.recordId === s.recordId);
                if (original && String(original.sessionNo) !== String(s.sessionNo)) {
                    updates.push(s);
                }
            });

            if (updates.length > 0) {
                console.log(`Background Renumbering ${updates.length} sessions...`);
                await Promise.all(updates.map(u => updateRecord(u)));
            }

            // 3. Final Refresh to sync everything
            loadData();
        } catch (e) {
            console.error(e);
            alert("Background Sync Error: " + e.message + ". Please refresh.");
            loadData(); // Revert to server state on error
        }
    };

    const handleLogin = (user) => {
        setUserName(user.name);
        setUserEmail(user.email);
        localStorage.setItem('appUserName', user.name);
        localStorage.setItem('appUserEmail', user.email);
    };

    const handleLogoutClick = () => {
        setIsLogoutModalOpen(true);
    };

    const confirmLogout = () => {
        setUserName('');
        setUserEmail('');
        localStorage.removeItem('appUserName');
        localStorage.removeItem('appUserEmail');
        setIsLogoutModalOpen(false);
    };



    // 7. Prevent Accidental Exit
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (activeSession && activeSession.status === 'In Progress') {
                console.log("Preventing unload: Session is active");
                e.preventDefault();
                e.returnValue = 'You have an active session. Are you sure you want to leave?';
            }
        };

        if (activeSession && activeSession.status === 'In Progress') {
            console.log("Exit protection ENABLED for session:", activeSession.sessionNo);
        }

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [activeSession]);

    const navigate = useNavigate();
    const location = useLocation();

    // If not logged in, show Login Page
    if (!userName) {
        return <LoginPage onLogin={handleLogin} />;
    }

    return (
        <DashboardLayout
            userProfile={{ name: userName || 'Guest', role: 'Developer' }}
            onEditProfile={handleLogoutClick}
        >
            <div className="fade-in-entry">
                {/* Navigation / Header Area */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>

                    {/* Add Record Button (Visible on both Dashboard & History) */}
                    {/* Add Record Button Removed */}

                    {location.pathname === '/' ? (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={handleManualAdd}
                                style={{
                                    padding: '0.75rem 1.25rem',
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    boxShadow: 'var(--shadow-sm)',
                                    transition: 'transform 0.1s ease',
                                }}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
                                Add Record
                            </button>
                            <button
                                onClick={loadData}
                                disabled={loading}
                                style={{
                                    padding: '0.75rem 1rem',
                                    backgroundColor: 'white',
                                    color: 'var(--text-secondary)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                <span style={{ fontSize: '1.1rem', animation: loading ? 'spin 1s linear infinite' : 'none' }}>↻</span>
                                {loading ? 'Syncing...' : 'Refresh'}
                            </button>
                            <button
                                onClick={() => navigate('/history')}
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
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate('/')}
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

                <Routes>
                    <Route path="/" element={
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'stretch' }}>
                            <TimerCard
                                activeSession={activeSession}
                                onStart={handleStartWork}
                                onPause={handlePauseWork}
                                onResume={handleResumeWork}
                                onEnd={handleEndClick}
                                reminderInterval={reminderInterval}
                                setReminderInterval={setReminderInterval}
                            />
                            <StatsCard
                                totalSeconds={todayStats.seconds}
                                sessionCount={todayStats.count}
                            />
                        </div>
                    } />
                    <Route path="/history" element={
                        <HistoryGrid
                            sessions={sessions}
                            onEdit={handleEditClick}
                            onDelete={initiateDelete}
                        />
                    } />
                </Routes>
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
                onDelete={initiateDelete}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={executeDelete}
            />



            <CheckInModal
                isOpen={isCheckInModalOpen}
                onContinue={() => {
                    setIsCheckInModalOpen(false);
                    // Reset reminder timer
                    updateSessionReminderTime();
                }}
                onStop={() => {
                    setIsCheckInModalOpen(false);
                    handleEndClick();
                }}
            />
            {/* Logout Confirmation Modal */}
            <LogoutConfirmationModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={confirmLogout}
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

