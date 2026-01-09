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
            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-[24px] border border-border-main shadow-sm">
                <div className="p-6 flex justify-between items-center border-b border-border-main bg-white shrink-0">
                    <h2 className="m-0 text-xl font-semibold text-text-main">Progress Management</h2>

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
                                    cellRenderer: (params) => {
                                        const isCompleted = params.value === 'Completed';
                                        return (
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[0.75rem] font-semibold leading-none
                                                ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {params.value}
                                            </span>
                                        );
                                    }
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
                            rowHeight={70}
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
            </div>
        </>
    );
};

export default AdminHistory;
