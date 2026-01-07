
import React from 'react';

const WhiteFlipUnit = ({ value, label }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <div className="white-flip-container">
            {/* The Clack Card */}
            <div className="white-flip-card">
                {value.toString().padStart(2, '0')}
            </div>
            {/* The Mechanical Hinges */}
            <div className="white-flip-hinge hinge-left"></div>
            <div className="white-flip-hinge hinge-right"></div>
        </div>
        <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            letterSpacing: '1px'
        }}>
            {label}
        </span>
    </div>
);

const StatsCard = ({ totalSeconds, sessionCount }) => {
    const formatTime = (totalSeconds) => {
        // Prevent NaN
        if (isNaN(totalSeconds)) totalSeconds = 0;

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);
        return { h, m, s };
    };

    const { h, m, s } = formatTime(totalSeconds);

    return (
        <div style={{
            borderRadius: '16px',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            height: '100%',
            boxSizing: 'border-box',
            background: 'white',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative'
        }}>

            {/* Header */}
            <h3 style={{
                margin: '0 0 2rem 0',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 700,
                textAlign: 'center'
            }}>
                Daily Progress
            </h3>

            {/* Flip Clock Display */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>

                {/* Section Layout - Distinct from Time */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,1), 0 4px 6px rgba(0,0,0,0.05)',
                        border: '4px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                    }}>
                        <div style={{
                            position: 'absolute', inset: '4px', borderRadius: '50%',
                            border: '1px dashed #cbd5e1'
                        }}></div>
                        <span style={{
                            fontSize: '2rem',
                            fontWeight: 800,
                            color: '#334155',
                            fontFamily: "'Inter', sans-serif"
                        }}>
                            {sessionCount}
                        </span>
                    </div>
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#64748b',
                        letterSpacing: '1px',
                        textTransform: 'uppercase'
                    }}>
                        SECTION
                    </span>
                </div>

                {/* Divider - Vertical Line */}
                <div style={{ width: '1px', height: '60px', background: '#e2e8f0', margin: '0 0.5rem 1.5rem 0.5rem' }}></div>

                <WhiteFlipUnit value={h} label="HRS" />
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#cbd5e1', marginTop: '-1.5rem' }}>:</div>
                <WhiteFlipUnit value={m} label="MIN" />
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#cbd5e1', marginTop: '-1.5rem' }}>:</div>
                <WhiteFlipUnit value={s} label="SEC" />
            </div>

        </div>
    );
};

export default StatsCard;
