
import React, { useState, useEffect } from 'react';

const NeonRing = ({ value, max, label, colorStops }) => {
    const radius = 60;
    const strokeWidth = 6;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(value / max, 0), 1);
    const strokeDashoffset = circumference * (1 - progress);

    const gradientId = `grad-${label}`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 10px', position: 'relative' }}>

            {/* Subtle professional background hint */}
            <div style={{
                position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%',
                borderRadius: '50%',
                background: colorStops[0],
                filter: 'blur(20px)',
                opacity: 0.05,
                zIndex: 0
            }}></div>

            <div style={{ position: 'relative', width: '140px', height: '140px', zIndex: 1 }}>
                <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={colorStops[0]} />
                            <stop offset="100%" stopColor={colorStops[1]} />
                        </linearGradient>
                    </defs>

                    {/* Track */}
                    <circle
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="transparent"
                        stroke="#e2e8f0"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />

                    {/* Progress Ring */}
                    <circle
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="transparent"
                        stroke={`url(#${gradientId})`}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{
                            transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    />
                </svg>

                {/* Center Value */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.5rem', fontWeight: 600, color: 'var(--text-primary)',
                    fontFamily: "'Inter', sans-serif",
                }}>
                    {value.toString().padStart(2, '0')}
                </div>
            </div>

            {/* Label */}
            <span style={{
                marginTop: '1rem',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 600
            }}>
                {label}
            </span>
        </div>
    );
};

const TimerCard = ({ onStart, onEnd, onPause, onResume, activeSession, reminderInterval, setReminderInterval }) => {
    // We need to alias props for the inner logic if we used 'props' in previous step, 
    // but actually I used 'props.setReminderInterval' in previous edit which might be error if props is not defined.
    // Let's correct that in next step or assume I can access it if I passed props.
    // Actually, in the previous step I used `props.setReminderInterval` effectively assuming `props` existed in scope or implied.
    // React functional components destructure usually.
    // Let's try to fix the previous code block via THIS tool call by redefining the whole component signature and the place where I used it?
    // No, I can't overwrite easily. 
    // Let's just destructure it here.
    // Wait, the previous edit used `if (props.setReminderInterval)`. 'props' is NOT defined in `const TimerCard = ({...})`.
    // I made a mistake in the previous edit. I need to fix that line.

    const props = { setReminderInterval }; // Hack to make previous code work? No, that's messy.
    // Better: I will re-write the destructuring line and ALSO fix the usage in one go if possible, 
    // or I will use multi_replace to fix both.

    // Actually, I can just define 'props' variable here mapping to the destructured arg.
    const internalProps = { setReminderInterval };

    const [elapsed, setElapsed] = useState(0);
    // Manual entry logic removed


    useEffect(() => {
        let interval = null;
        if (activeSession) {
            const updateTimer = () => {
                const now = new Date();
                const start = new Date(activeSession.startTimeFull || activeSession.startTimeStr);

                if (!isNaN(start.getTime())) {
                    let diffSeconds = Math.floor((now - start) / 1000);

                    // Subtract total accumulated pause time
                    const totalPaused = activeSession.totalPausedSeconds || 0;
                    diffSeconds -= totalPaused;

                    // If currently paused, subtract current pause duration too (freeze the timer)
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
            // Even if paused, we run interval to keep UI reactive if we want to show "Paused for X min" later
            // But for now, it just keeps 'elapsed' stable.
            interval = setInterval(updateTimer, 1000);
        } else {
            setElapsed(0);
        }
        return () => clearInterval(interval);
    }, [activeSession]);

    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;

    // Professional Blue Palette for Rings
    const ringColors = {
        h: ['#0f172a', '#334155'], // Slate 900 -> 700 (Dark Navy)
        m: ['#3b82f6', '#2563eb'], // Blue 500 -> 600
        s: ['#0ea5e9', '#38bdf8']  // Sky 500 -> 400
    };

    return (
        <div style={{
            padding: '1rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%'
        }}>

            {/* Date Header */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <h2 style={{
                    margin: '0 0 0.8rem 0',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    color: 'var(--text-secondary)',
                    fontWeight: 600
                }}>
                    {activeSession ? (activeSession.lastPauseTime ? 'Session Paused' : 'Tracking Time') : 'Ready to Start'}
                </h2>
                <div style={{
                    display: 'inline-flex',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    background: 'white',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    fontSize: '1rem',
                    alignItems: 'center', gap: '0.5rem'
                }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>



            {/* Reminder Selector (Only when not active) */}
            {/* Reminder Selector (Always Visible) */}
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Remind me:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {/* Presets in SECONDS */}
                    <select
                        value={[0, 60, 300, 600, 1800, 3600].includes(reminderInterval) ? reminderInterval : -1}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (setReminderInterval) setReminderInterval(val);
                        }}
                        style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            outline: 'none',
                            cursor: 'pointer'
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

                    {/* Custom Input (H:M:S) */}
                    {(![0, 60, 300, 600, 1800, 3600].includes(reminderInterval)) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {/* Hours */}
                            <input
                                type="number"
                                min="0"
                                placeholder="H"
                                value={reminderInterval > 0 ? Math.floor(reminderInterval / 3600) : ''}
                                onChange={(e) => {
                                    const h = parseInt(e.target.value) || 0;
                                    const currentSec = reminderInterval > 0 ? reminderInterval : 0;
                                    const m = Math.floor((currentSec % 3600) / 60);
                                    const s = currentSec % 60;
                                    setReminderInterval(h * 3600 + m * 60 + s);
                                }}
                                style={{
                                    width: '36px',
                                    padding: '0.4rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '0.9rem',
                                    textAlign: 'center'
                                }}
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>h</span>

                            {/* Minutes */}
                            <input
                                type="number"
                                min="0"
                                max="59"
                                placeholder="M"
                                value={reminderInterval > 0 ? Math.floor((reminderInterval % 3600) / 60) : ''}
                                onChange={(e) => {
                                    const m = parseInt(e.target.value) || 0;
                                    const currentSec = reminderInterval > 0 ? reminderInterval : 0;
                                    const h = Math.floor(currentSec / 3600);
                                    const s = currentSec % 60;
                                    setReminderInterval(h * 3600 + m * 60 + s);
                                }}
                                style={{
                                    width: '36px',
                                    padding: '0.4rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '0.9rem',
                                    textAlign: 'center'
                                }}
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>m</span>

                            {/* Seconds */}
                            <input
                                type="number"
                                min="0"
                                max="59"
                                placeholder="S"
                                value={reminderInterval > 0 ? (reminderInterval % 60) : ''}
                                onChange={(e) => {
                                    const s = parseInt(e.target.value) || 0;
                                    const currentSec = reminderInterval > 0 ? reminderInterval : 0;
                                    const h = Math.floor(currentSec / 3600);
                                    const m = Math.floor((currentSec % 3600) / 60);
                                    setReminderInterval(h * 3600 + m * 60 + s);
                                }}
                                style={{
                                    width: '36px',
                                    padding: '0.4rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '0.9rem',
                                    textAlign: 'center'
                                }}
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>s</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Professional Rings */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <NeonRing value={h} max={12} label="Hours" colorStops={ringColors.h} />
                <NeonRing value={m} max={60} label="Minutes" colorStops={ringColors.m} />
                <NeonRing value={s} max={60} label="Seconds" colorStops={ringColors.s} />
            </div>

            {/* Button Area */}
            {activeSession ? (
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {/* Pause/Resume Button */}
                    {activeSession.lastPauseTime ? (
                        <button
                            onClick={onResume}
                            style={{
                                background: '#f59e0b', // Amber 500
                                color: 'white',
                                border: 'none',
                                padding: '1rem 2rem',
                                borderRadius: '8px',
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: 'var(--shadow-sm)',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            <span>▶ Resume</span>
                        </button>
                    ) : (
                        <button
                            onClick={onPause}
                            style={{
                                background: '#fbbf24', // Amber 400
                                color: '#78350f', // Amber 900
                                border: 'none',
                                padding: '1rem 2rem',
                                borderRadius: '8px',
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: 'var(--shadow-sm)',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
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
                            padding: '1rem 2rem',
                            borderRadius: '8px',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#ef4444';
                            e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.color = '#ef4444';
                        }}
                    >
                        Stop Session
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                    <button
                        onClick={() => onStart()}
                        style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '1rem 3.5rem',
                            borderRadius: '8px',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.2)',
                            transition: 'all 0.2s ease',
                            display: 'flex', alignItems: 'center', gap: '0.8rem'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--primary-color)'}
                    >
                        <span style={{ fontSize: '1.2rem' }}>▸</span> Start Session
                    </button>
                </div>
            )}

        </div>
    );
};

export default TimerCard;
