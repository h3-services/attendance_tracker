import React from 'react';

const DigitalUnit = ({ value, label }) => (
    <div className="flex flex-col items-center gap-2">
        <div className="relative bg-white border border-slate-200 rounded-lg w-[80px] h-[90px] flex items-center justify-center shadow-lg">
            {/* Center Line */}
            <div className="absolute w-full h-px bg-slate-100 top-1/2 -translate-y-1/2"></div>

            {/* Left Hinge */}
            <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-[4px] h-[12px] bg-slate-400 rounded-sm"></div>

            {/* Right Hinge */}
            <div className="absolute right-[-2px] top-1/2 -translate-y-1/2 w-[4px] h-[12px] bg-slate-400 rounded-sm"></div>

            <span className="text-5xl font-bold text-slate-800 font-sans z-10">
                {value.toString().padStart(2, '0')}
            </span>
        </div>
        <span className="text-[0.7rem] font-bold text-slate-500 tracking-widest uppercase">
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
        <div className="rounded-3xl py-8 px-6 flex flex-col justify-center items-center w-full h-auto min-h-[50%] box-border bg-white border border-slate-200 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] relative">
            {/* Header */}
            <h3 className="mb-6 text-sm text-slate-500 uppercase tracking-widest font-bold text-center">
                Daily Progress
            </h3>

            {/* Display Area */}
            <div className="flex items-center justify-center gap-6">

                {/* Section Indicator */}
                <div className="flex flex-col items-center gap-2">
                    <div className="w-[90px] h-[90px] rounded-full bg-white border border-slate-200 flex items-center justify-center relative shadow-sm">
                        <div className="absolute inset-[4px] rounded-full border border-dashed border-slate-300 opacity-50"></div>
                        <span className="text-[2.5rem] font-extrabold text-slate-800 font-sans">
                            {sessionCount}
                        </span>
                    </div>
                    <span className="text-xs font-bold text-slate-500 tracking-wide uppercase">
                        SECTION
                    </span>
                </div>

                {/* Divider */}
                <div className="w-px h-[100px] bg-slate-100 mx-2"></div>

                {/* Time Units */}
                <div className="flex items-center gap-3">
                    <DigitalUnit value={h} label="HRS" />
                    <div className="text-2xl font-bold text-slate-300 -mt-8">:</div>
                    <DigitalUnit value={m} label="MIN" />
                    <div className="text-2xl font-bold text-slate-300 -mt-8">:</div>
                    <DigitalUnit value={s} label="SEC" />
                </div>
            </div>

        </div>
    );
};

export default StatsCard;
