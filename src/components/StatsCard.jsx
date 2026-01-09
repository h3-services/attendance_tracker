
import React from 'react';

const DigitalUnit = ({ value, label }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
            background: 'white',
            border: '1px solid #e2e8f0', // Slate 200
            borderRadius: '12px',
            padding: '1rem 0.5rem',
            minWidth: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}>

            <span style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: '#1e293b', // Dark Slate Text
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1
            }}>
                {value.toString().padStart(2, '0')}
            </span>
        </div>
        <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#64748b',
            letterSpacing: '1px'
        }}>
            {label}
        </span>
    </div>
);

const StatsCard = ({ totalSeconds, sessionCount }) => {
    const formatTime = (totalSeconds) => {
        if (isNaN(totalSeconds)) totalSeconds = 0;
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);
        return { h, m, s };
    };

    const { h, m, s } = formatTime(totalSeconds);

    return (
        <div style={{
            borderRadius: '24px',
            padding: '1.5rem', // Reduced padding
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            boxSizing: 'border-box',
            background: 'white',
            border: '1px solid #e2e8f0', // Slate 200
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Stronger shadow
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <h3 style={{
                margin: '0 0 1.5rem 0',
                fontSize: '0.85rem',
                color: '#64748b', // Slate 500
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontWeight: 700,
                textAlign: 'center'
            }}>
                Daily Progress
            </h3>

            {/* Display Area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.2rem' }}>

                {/* Section Indicator */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: '70px', // Reduced
                        height: '70px', // Reduced
                        borderRadius: '50%',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{
                            position: 'absolute', inset: '3px', borderRadius: '50%',
                            border: '1px dashed #cbd5e1', // Slate 300
                            opacity: 0.5
                        }}></div>
                        <span style={{
                            fontSize: '2rem',
                            fontWeight: 800,
                            color: '#1e293b', // Dark Slate
                            fontFamily: "'Inter', sans-serif"
                        }}>
                            {sessionCount}
                        </span>
                    </div>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#64748b',
                        letterSpacing: '1px',
                        textTransform: 'uppercase'
                    }}>
                        SECTION
                    </span>
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '60px', background: '#f1f5f9', margin: '0 0.5rem' }}></div>

                {/* Time Units */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DigitalUnit value={h} label="HRS" />
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#94a3b8', marginTop: '-1.5rem' }}>:</div>
                    <DigitalUnit value={m} label="MIN" />
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#94a3b8', marginTop: '-1.5rem' }}>:</div>
                    <DigitalUnit value={s} label="SEC" />
                </div>
            </div>

        </div>
    );
};

export default StatsCard;
