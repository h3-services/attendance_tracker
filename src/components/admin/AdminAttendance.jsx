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
            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: '#ffffff', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Attendance Management</h2>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Calendar size={18} style={{ position: 'absolute', left: 12, color: 'var(--text-secondary)' }} />
                        <input
                            type="date"
                            value={historyFilterDate}
                            onChange={(e) => setHistoryFilterDate(e.target.value)}
                            style={{
                                padding: '0.6rem 1rem 0.6rem 2.5rem',
                                borderRadius: '2rem',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-color)',
                                fontSize: '0.9rem',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        />
                    </div>
                    {historyFilterDate && (
                        <button
                            onClick={() => setHistoryFilterDate('')}
                            className="btn btn-ghost"
                            style={{
                                fontSize: '0.85rem',
                                borderRadius: '2rem',
                                padding: '0.4rem 1rem',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>
            <div className="table-container" style={{ height: '100%', width: '100%', overflow: 'hidden', marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
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
                                cellStyle: { fontWeight: 700, color: '#000000' },
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
                        rowHeight={60}
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
        </>
    );
};

export default AdminAttendance;
