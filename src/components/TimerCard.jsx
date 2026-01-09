
import React, { useState, useEffect } from 'react';

const TimerUnit = ({ value, label, className = '' }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 15px' }}>
            <div className={className} style={{
                position: 'relative',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #334155', // Slate 700 - Crisp, solid border
                background: '#1e293b', // Slate 800 - Deep Matte Slate
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // Standard shadow
                transition: 'all 0.3s ease'
            }}>
                <div style={{
                    fontSize: '3.5rem',
                    fontWeight: 700, // Bold (reduced from Extra Bold)
                    color: 'white',
                    fontFamily: "'Inter', sans-serif",
                }}>
                    {value.toString().padStart(2, '0')}
                </div>
            </div>
            <span style={{
                marginTop: '1.25rem',
                fontSize: '0.8rem',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontWeight: 600
            }}>
                {label}
            </span>
        </div>
    );
};

const TimerCard = ({ onStart, onEnd, onPause, onResume, activeSession, reminderInterval, setReminderInterval }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        let interval = null;
        if (activeSession) {
            const updateTimer = () => {
                const now = new Date();
                const start = new Date(activeSession.startTimeFull || activeSession.startTimeStr);

                if (!isNaN(start.getTime())) {
                    let diffSeconds = Math.floor((now - start) / 1000);

                    const totalPaused = activeSession.totalPausedSeconds || 0;
                    diffSeconds -= totalPaused;

                    if (activeSession.lastPauseTime) {
                        const pauseStart = new Date(activeSession.lastPauseTime);
                        const currentPause = Math.floor((now - pauseStart) / 1000);
                        diffSeconds -= currentPause;
                    }

                    setElapsed(diffSeconds > 0 ? diffSeconds : 0);
                } else {
                    setElapsed(0);
                }
            };

            updateTimer();
            interval = setInterval(updateTimer, 1000);
        } else {
            setElapsed(0);
        }
        return () => clearInterval(interval);
    }, [activeSession]);

    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;

    return (
        <div style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%'
        }}>
            {/* Header Status */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    color: '#64748b',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                    background: '#f1f5f9',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    display: 'inline-block'
                }}>
                    {activeSession ? (activeSession.lastPauseTime ? 'Session Paused' : 'Session Active') : 'READY TO START'}
                </div>
                <div style={{
                    color: '#0f172a',
                    fontWeight: 500,
                    fontSize: '1.1rem',
                    marginTop: '0.5rem'
                }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Reminder Selector */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
                    Remind me:
                </label>
                <select
                    value={[0, 60, 300, 600, 1800, 3600].includes(reminderInterval) ? reminderInterval : -1}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (setReminderInterval) setReminderInterval(val);
                    }}
                    style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        color: '#0f172a',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        background: 'white'
                    }}
                >
                    <option value={0}>Never</option>
                    <option value={60}>Test (1 min)</option>
                    <option value={300}>Every 5m</option>
                    <option value={600}>Every 10m</option>
                    <option value={1800}>Every 30m</option>
                    <option value={3600}>Every 1h</option>
                    <option value={-1}>Custom...</option>
                </select>
            </div>

            {/* Units Display */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                marginBottom: '2.5rem'
            }}>
                <TimerUnit value={h} label="Hours" />
                <TimerUnit value={m} label="Minutes" />
                <TimerUnit
                    value={s}
                    label="Seconds"
                    className={activeSession && !activeSession.lastPauseTime ? 'animate-pulse-seconds' : ''}
                />
            </div>

            {/* Controls */}
            {activeSession ? (
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {activeSession.lastPauseTime ? (
                        <button
                            onClick={onResume}
                            style={{
                                background: '#0f172a',
                                color: 'white',
                                border: 'none',
                                padding: '0.8rem 2.5rem',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.6rem'
                            }}
                        >
                            <span>▶ Resume Session</span>
                        </button>
                    ) : (
                        <button
                            onClick={onPause}
                            style={{
                                background: '#facc15',
                                color: '#713f12',
                                border: 'none',
                                padding: '0.8rem 2.5rem',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.6rem'
                            }}
                        >
                            <span>⏸ Pause</span>
                        </button>
                    )}

                    <button
                        onClick={onEnd}
                        style={{
                            background: 'white',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            padding: '0.8rem 2.5rem',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Stop Session
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => onStart()}
                    style={{
                        background: '#0f172a',
                        color: 'white',
                        border: 'none',
                        padding: '1rem 3.5rem',
                        borderRadius: '8px',
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.8rem',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <span style={{ fontSize: '1rem' }}>▶</span> Start Session
                </button>
            )}
        </div>
    );
};

export default TimerCard;
