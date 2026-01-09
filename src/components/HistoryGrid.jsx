import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Calendar } from 'lucide-react';
import Loader3D from './common/Loader3D';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

const ActionMenu = ({ data, onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleViewDetails = () => {
        onEdit(data);
        setIsOpen(false);
    };

    const handleRemove = () => {
        onDelete(data.recordId);
        setIsOpen(false);
    };

    return (
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }} ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    color: '#64748b',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                onMouseEnter={e => e.target.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
            >
                ⋮
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '80%',
                    right: '10px',
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    zIndex: 9999,
                    minWidth: '140px',
                    overflow: 'hidden'
                }}>
                    <button
                        onClick={handleViewDetails}
                        style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.75rem 1rem',
                            background: 'white',
                            border: 'none',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            color: '#0f172a',
                            fontWeight: 500
                        }}
                        onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={e => e.target.style.backgroundColor = 'white'}
                    >
                        View Details
                    </button>
                    <button
                        onClick={handleRemove}
                        style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.75rem 1rem',
                            background: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            color: '#ef4444',
                            fontWeight: 500
                        }}
                        onMouseEnter={e => e.target.style.backgroundColor = '#fef2f2'}
                        onMouseLeave={e => e.target.style.backgroundColor = 'white'}
                    >
                        Remove
                    </button>
                </div>
            )}
        </div>
    );
};

const HistoryGrid = ({ sessions, onEdit, onDelete, historyDate, setHistoryDate, onBack, loading }) => {

    // Process Data: Sort by Date Desc + Insert Header Rows
    const rowData = useMemo(() => {
        if (!sessions) return [];

        // 1. Sort by Date (Desc) then Session (Desc)
        const sorted = [...sessions].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA; // Newest date first
            return (parseInt(a.sessionNo) || 0) - (parseInt(b.sessionNo) || 0); // Session 1, 2, 3...
        });

        // 2. Insert Headers
        const processed = [];
        let currentDate = null;

        sorted.forEach(row => {
            // Robust date string extraction (Handle T separator if present)
            const rowDate = row.date ? String(row.date).split('T')[0] : 'Unknown Date';

            if (rowDate !== currentDate) {
                // Create formatted date string "Jan 7 - Wednesday"
                const d = new Date(rowDate);
                // "Jan 7 - Wednesday" format construction
                const options = { month: 'short', day: 'numeric' };
                const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
                const datePart = d.toLocaleDateString('en-US', options);

                const label = isNaN(d.getTime())
                    ? rowDate
                    : `${datePart} - ${weekday}`;

                processed.push({ isHeader: true, dateLabel: label });
                currentDate = rowDate;
            }
            processed.push(row);
        });

        return processed;
    }, [sessions]);

    // Full Width Row Logic
    const isFullWidthRow = (params) => {
        return params.rowNode.data && params.rowNode.data.isHeader;
    };

    const fullWidthCellRenderer = (params) => {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1rem',
                background: '#fff',
                borderBottom: '1px solid var(--border-subtle)'
            }}>
                <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--primary-color)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    width: '100%'
                }}>
                    {params.data.dateLabel}
                    <div style={{ height: '1px', flex: 1, background: 'var(--border-subtle)', opacity: 0.5 }}></div>
                </div>
            </div>
        );
    };

    // Column Definitions
    const colDefs = useMemo(() => [
        {
            field: 'sessionNo',
            headerName: 'No',
            width: 100, // Increased
            sortable: false,
            suppressSizeToFit: true,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (p) => {
                const val = String(p.value).padStart(2, '0');
                return (
                    <span style={{ fontWeight: 700, color: '#64748b' }}>#{val}</span>
                );
            }
        },
        {
            field: 'startTime',
            headerName: 'Start Time', // Full name
            width: 150, // Increased significantly
            suppressSizeToFit: true,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            valueFormatter: (p) => {
                if (!p.value) return '-';
                let d;
                if (String(p.value).includes('T')) {
                    d = new Date(p.value);
                } else {
                    const [h, m] = String(p.value).split(':');
                    d = new Date();
                    d.setHours(h || 0, m || 0);
                }
                if (!isNaN(d.getTime())) {
                    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                }
                return p.value;
            }
        },
        {
            field: 'endTime',
            headerName: 'End Time', // Full name
            width: 150, // Increased
            suppressSizeToFit: true,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            valueFormatter: (p) => { // Similar formatter 
                if (!p.value) return '...';
                let d;
                if (String(p.value).includes('T')) {
                    d = new Date(p.value);
                } else {
                    const [h, m] = String(p.value).split(':');
                    d = new Date();
                    d.setHours(h || 0, m || 0);
                }
                if (!isNaN(d.getTime())) {
                    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                }
                return p.value;
            }
        },
        {
            field: 'duration',
            headerName: 'Duration',
            width: 220,
            suppressSizeToFit: true,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
            valueFormatter: (p) => p.value ? p.value : '-'
        },
        {
            field: 'workDescription',
            headerName: 'Description',
            flex: 2,
            minWidth: 300,
            wrapText: true,
            autoHeight: true,
            cellStyle: { display: 'flex', alignItems: 'center' },
            cellRenderer: (p) => (
                <div style={{ lineHeight: '1.4', padding: '8px 0' }}>{p.value}</div>
            )
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 160, // Increased
            suppressSizeToFit: true,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (p) => {
                const s = String(p.value).toLowerCase();
                let bg = '#e2e8f0';
                let color = '#475569';

                if (s === 'completed') {
                    bg = '#dcfce7';
                    color = '#166534';
                } else if (s === 'in progress') {
                    bg = '#dbeafe';
                    color = '#1e40af';
                }

                return (
                    <span style={{
                        backgroundColor: bg,
                        color: color,
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        textTransform: 'capitalize',
                        display: 'inline-block',
                        lineHeight: 1
                    }}>
                        {p.value}
                    </span>
                );
            }
        },
        {
            headerName: '',
            width: 60,
            pinned: 'right', // Pin to right for better UX
            suppressSizeToFit: true,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }, // Overflow visible for dropdown
            cellRenderer: (p) => (
                <ActionMenu
                    data={p.data}
                    onEdit={p.context.onEdit}
                    onDelete={p.context.onDelete}
                />
            ),
            sortable: false,
        }
    ], []);

    // Default Col Def
    const defaultColDef = useMemo(() => ({
        resizable: true,
        sortable: false, // Disable default sorting to preserve group order
        filter: false,
        cellStyle: { display: 'flex', alignItems: 'center' }
    }), []);

    // Empty State (optional to handle inside grid, but we'll leave it simple for now)

    // Show loading animation
    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[24px] border border-border-main shadow-sm" style={{ height: 'calc(100vh - 120px)', marginTop: '-1rem' }}>
                <Loader3D />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-[24px] border border-border-main shadow-sm" style={{ height: 'calc(100vh - 120px)', marginTop: '-1rem' }}>
            {/* Header Section */}
            <div className="p-6 flex justify-between items-center border-b border-border-main bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary transition-colors"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <span>←</span> BACK
                    </button>
                    <div className="h-6 w-px bg-border-main"></div>
                    <h2 className="m-0 text-xl font-semibold text-text-main">Record History</h2>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="relative flex items-center">
                        <Calendar size={18} className="absolute left-3 text-text-dim pointer-events-none" />
                        <input
                            type="date"
                            value={historyDate}
                            onChange={(e) => setHistoryDate(e.target.value)}
                            className="bg-bg-main pl-10 pr-4 py-2 rounded-full border border-border-main text-[0.9rem] text-text-main outline-none focus:ring-1 focus:ring-primary shadow-sm appearance-none"
                        />
                    </div>
                </div>
            </div>

            <div className="ag-theme-alpine h-full w-full">
                <AgGridReact
                    rowData={rowData} // Use Processed Data
                    columnDefs={colDefs}
                    defaultColDef={defaultColDef}
                    rowHeight={60}
                    headerHeight={50}
                    theme="legacy"
                    animateRows={true}
                    pagination={true}
                    paginationPageSize={20}
                    context={{ onEdit, onDelete }}
                    // Header Row Config
                    isFullWidthRow={isFullWidthRow}
                    fullWidthCellRenderer={fullWidthCellRenderer}
                    overlayNoRowsTemplate="<span style='padding: 1rem;'>No records found for this date</span>"
                />
            </div>
        </div>
    );
};

export default HistoryGrid;
