
import React from 'react';

const SessionHistory = ({ sessions }) => {

    if (!sessions || sessions.length === 0) {
        return (
            <div style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                padding: '4rem 2rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                marginTop: '2rem'
            }}>
                <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'var(--bg-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1rem'
                }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>No Sessions Yet</h3>
                <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.8 }}>Start tracking time above to see your history.</p>
            </div>
        );
    }

    // Filter out any empty rows if necessary, or sort by ID desc
    const sortedSessions = [...sessions].sort((a, b) => (b.recordId || 0) - (a.recordId || 0));

    return (
        <div style={{
            backgroundColor: 'var(--card-bg)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            marginTop: '2rem'
        }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Session History</h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', fontWeight: 600, width: '80px' }}>ID</th>
                            <th style={{ padding: '1rem', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: '1rem', fontWeight: 600 }}>Session</th>
                            <th style={{ padding: '1rem', fontWeight: 600 }}>Time</th>
                            <th style={{ padding: '1rem', fontWeight: 600 }}>Duration</th>
                            <th style={{ padding: '1rem', fontWeight: 600, width: '40%' }}>Description</th>
                            <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedSessions.map((session, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>#{session.recordId}</td>
                                <td style={{ padding: '1rem' }}>{session.date ? session.date.slice(0, 10) : ''}</td>
                                <td style={{ padding: '1rem' }}>{session.sessionNo}</td>
                                <td style={{ padding: '1rem', fontFamily: 'monospace' }}>
                                    {session.startTime} - {session.endTime || '...'}
                                </td>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>
                                    {session.duration || '-'}
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                    {session.workDescription || (
                                        <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No description</span>
                                    )}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <StatusBadge status={session.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const s = String(status).toLowerCase();
    let bg = 'var(--secondary-color)';
    let color = 'var(--text-secondary)';

    if (s === 'completed') {
        bg = 'rgba(16, 185, 129, 0.1)'; color = 'var(--success-color)';
    } else if (s === 'in progress' || s === 'pending') {
        bg = 'rgba(79, 70, 229, 0.1)'; color = 'var(--primary-color)';
    } else if (s === 'rejected') {
        bg = 'rgba(239, 68, 68, 0.1)'; color = 'var(--danger-color)';
    }

    return (
        <span style={{
            backgroundColor: bg, color: color,
            padding: '0.25rem 0.75rem', borderRadius: '999px',
            fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize'
        }}>
            {status || 'Unknown'}
        </span>
    );
};

export default SessionHistory;
