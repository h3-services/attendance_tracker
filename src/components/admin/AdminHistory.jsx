import React, { useState, useEffect } from 'react';
import { fetchData } from '../../api';
import { Calendar } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Register all community modules
ModuleRegistry.registerModules([AllCommunityModule]);

import Loader3D from '../common/Loader3D';

const AdminHistory = () => {
    const [globalHistory, setGlobalHistory] = useState([]);
    const [loadingGlobal, setLoadingGlobal] = useState(false);
    const [historyFilterDate, setHistoryFilterDate] = useState(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    useEffect(() => {
        const loadGlobalHistory = async () => {
            setLoadingGlobal(true);
            try {
                const data = await fetchData({});
                setGlobalHistory(data);
            } catch (error) {
                console.error('Failed to load global history:', error);
            } finally {
                setLoadingGlobal(false);
            }
        };
        loadGlobalHistory();
    }, []);

    const filteredHistory = historyFilterDate
        ? globalHistory.filter(item => {
            if (!item.date) return false;
            const itemDateStr = new Date(item.date).toLocaleDateString('en-CA');
            const filterDateStr = new Date(historyFilterDate).toLocaleDateString('en-CA');
            return itemDateStr === filterDateStr;
        })
        : globalHistory;

    if (loadingGlobal) {
        return <Loader3D />;
    }

    return (
        <>
            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: '#ffffff', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Progress Management</h2>

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
                        rowData={filteredHistory}
                        columnDefs={[
                            ...(!historyFilterDate ? [{
                                field: 'date',
                                headerName: 'Date',
                                flex: 1,
                                filter: false,
                                valueFormatter: (params) => {
                                    if (!params.value) return '';
                                    const date = new Date(params.value);
                                    if (isNaN(date.getTime())) return params.value;
                                    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                                }
                            }] : []),
                            { field: 'userName', headerName: 'User', flex: 1, filter: false },
                            {
                                field: 'sessionNo',
                                headerName: 'Session',
                                width: 100
                            },
                            { field: 'startTime', headerName: 'Start', width: 100 },
                            { field: 'endTime', headerName: 'End', width: 100 },
                            {
                                field: 'duration',
                                headerName: 'Duration',
                                width: 120,
                                cellStyle: { fontWeight: 600 },
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
                            },
                            { field: 'project', headerName: 'Project', width: 120 },
                            { field: 'category', headerName: 'Category', width: 120 },
                            {
                                field: 'workDescription',
                                headerName: 'Description',
                                width: 200,
                                tooltipField: 'workDescription',
                                cellRenderer: (params) => (
                                    <span title={params.value}>
                                        {params.value?.substring(0, 30)}{params.value?.length > 30 ? '...' : ''}
                                    </span>
                                )
                            },
                            {
                                field: 'status',
                                headerName: 'Status',
                                width: 120,
                                cellRenderer: (params) => (
                                    <span className={`badge ${params.value === 'Completed' ? 'badge-success' : 'badge-pending'}`}>
                                        {params.value}
                                    </span>
                                )
                            },
                            { field: 'approvedState', headerName: 'Approved State', width: 140 }
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
                        overlayLoadingTemplate="<div class='loading-spinner'></div> Loading History..."
                        overlayNoRowsTemplate="<span style='padding: 1rem;'>No history found</span>"
                    />
                </div>
            </div>
        </>
    );
};

export default AdminHistory;
