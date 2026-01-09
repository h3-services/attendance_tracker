import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Register all community modules
ModuleRegistry.registerModules([AllCommunityModule]);

import Loader3D from '../common/Loader3D';

const AdminAttendance = () => {
    const { attendance, loading } = useOutletContext();
    const [historyFilterDate, setHistoryFilterDate] = useState(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const filteredAttendance = historyFilterDate
        ? attendance.filter(item => {
            if (!item.date) return false;
            let dStr = item.date;
            if (dStr.includes('T')) dStr = dStr.split('T')[0];
            return dStr === historyFilterDate;
        })
        : attendance;

    if (loading) {
        return <Loader3D />;
    }

    return (
        <>
            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-[24px] border border-border-main shadow-sm">
                <div className="p-6 flex justify-between items-center border-b border-border-main bg-white shrink-0">
                    <h2 className="m-0 text-xl font-semibold text-text-main">Attendance Management</h2>

                    <div className="flex gap-4 items-center">
                        <div className="relative flex items-center">
                            <Calendar size={18} className="absolute left-3 text-text-dim pointer-events-none" />
                            <input
                                type="date"
                                value={historyFilterDate}
                                onChange={(e) => setHistoryFilterDate(e.target.value)}
                                className="bg-bg-main pl-10 pr-4 py-2 rounded-full border border-border-main text-[0.9rem] text-text-main outline-none focus:ring-1 focus:ring-primary shadow-sm appearance-none"
                            />
                        </div>
                        {historyFilterDate && (
                            <button
                                onClick={() => setHistoryFilterDate('')}
                                className="px-4 py-2 text-[0.85rem] font-semibold text-text-dim hover:text-text-main border border-border-main rounded-full bg-white transition-all cursor-pointer"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 w-full overflow-hidden mt-0">
                    <div className="ag-theme-alpine h-full w-full">
                        <AgGridReact
                            rowData={filteredAttendance}
                            columnDefs={[
                                {
                                    field: 'date',
                                    headerName: 'Date',
                                    flex: 1,
                                    filter: false,
                                    valueFormatter: (params) => {
                                        if (!params.value) return '';
                                        if (params.value.includes('T')) return new Date(params.value).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                                        // Handle string dates YYYY-MM-DD
                                        const parts = params.value.split('-');
                                        if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`;
                                        return params.value;
                                    }
                                },
                                { field: 'user', headerName: 'User', flex: 1, filter: false },
                                {
                                    field: 'totalDuration',
                                    headerName: 'Duration',
                                    flex: 1,
                                    cellStyle: { fontWeight: 700, color: '#0f172a' },
                                    valueFormatter: (params) => {
                                        if (!params.value) return '';
                                        const parts = String(params.value).split(':');
                                        if (parts.length < 2) return params.value;
                                        const h = parseInt(parts[0], 10);
                                        const m = parseInt(parts[1], 10);
                                        const s = parts[2] ? parseInt(parts[2], 10) : 0;

                                        let result = [];
                                        if (h > 0) result.push(`${h} hr`);
                                        if (m > 0) result.push(`${m} min`);
                                        if (s > 0) result.push(`${s} sec`);

                                        return result.join(' ') || '0 sec';
                                    }
                                }
                            ]}
                            defaultColDef={{
                                sortable: true,
                                resizable: true,
                            }}
                            pagination={true}
                            paginationPageSize={10}
                            paginationPageSizeSelector={[10, 20, 50]}
                            animateRows={true}
                            rowHeight={70}
                            theme="legacy"
                            onGridReady={(params) => {
                                params.api.sizeColumnsToFit();
                                window.addEventListener('resize', () => {
                                    setTimeout(() => params.api.sizeColumnsToFit(), 100);
                                });
                            }}
                            overlayNoRowsTemplate="<span style='padding: 1rem;'>No records found for this date</span>"
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminAttendance;
