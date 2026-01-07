import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

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
                    position: 'fixed', // Use fixed to avoid clipping in grid cells
                    right: '40px', // Adjust based on grid layout approximation or use popper.js for robustness
                    // Simple hack: Since this is inside a relative parent in a grid cell, fixed might be tricky without coords.
                    // Let's try absolute with high z-index, but grid overflow hidden might clip it.
                    // AG Grid cells often clip overflow.
                    // BETTER APPROACH: absolute right: 0, top: 100% zIndex 9999
                    // IF overflow is issue, might need portal, but for simple request let's try absolute first.
                    // If clipped, we might need a different styling strategy.
                    // EDIT: standard absolute dropdown
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

const HistoryGrid = ({ sessions, onEdit, onDelete }) => {

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
            headerName: 'Session',
            width: 90,
            sortable: false, // Sorting handled pre-grid
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (p) => {
                const val = String(p.value).padStart(2, '0');
                return (
                    // Mini Flip Card
                    <div style={{
                        width: '32px',
                        height: '36px',
                        background: 'linear-gradient(to bottom, #ffffff 0%, #f1f5f9 100%)',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        fontFamily: "'Inter', sans-serif",
                        position: 'relative'
                    }}>
                        {/* Horizontal Line */}
                        <div style={{
                            position: 'absolute', top: '50%', left: 0, right: 0, height: '1px',
                            background: 'rgba(0,0,0,0.05)', boxShadow: '0 1px 0 rgba(255,255,255,0.5)',
                            transform: 'translateY(-50%)'
                        }}></div>

                        {/* Value relative z-index to sit above line */}
                        <span style={{ position: 'relative', zIndex: 1 }}>{val}</span>
                    </div>
                );
            }
        },
        {
            field: 'startTime',
            headerName: 'Start Time',
            width: 110,
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
            headerName: 'End Time',
            width: 110,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            valueFormatter: (p) => {
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
            width: 110,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
            valueFormatter: (p) => p.value ? p.value : '-'
        },
        {
            field: 'workDescription',
            headerName: 'Description',
            flex: 2,
            minWidth: 200,
            wrapText: true,
            autoHeight: true,
            cellStyle: { display: 'flex', alignItems: 'center' },
            cellRenderer: (p) => (
                <div style={{ lineHeight: '1.4', padding: '8px 0' }}>{p.value}</div>
            )
        },
        {
            field: 'project',
            headerName: 'Project',
            width: 120,
            cellStyle: { display: 'flex', alignItems: 'center' }
        },
        {
            field: 'category',
            headerName: 'Category',
            width: 120,
            cellStyle: { display: 'flex', alignItems: 'center' }
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 130,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (p) => {
                const s = String(p.value).toLowerCase();
                let color = 'gray';
                if (s === 'completed') color = 'green';
                if (s === 'in progress') color = 'blue';
                return (
                    <span style={{
                        color: color,
                        fontWeight: 600,
                        textTransform: 'capitalize'
                    }}>
                        ● {p.value}
                    </span>
                );
            }
        },
        {
            field: 'approvedState',
            headerName: 'Approval',
            width: 130,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (p) => {
                const s = String(p.value || 'Pending').toLowerCase();
                const isApproved = s === 'approved';
                return (
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: isApproved ? '#DEF7EC' : '#FEECDC',
                        color: isApproved ? '#03543E' : '#8A2C0D',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        letterSpacing: '0.5px'
                    }}>
                        {String(p.value || 'Pending').toUpperCase()}
                    </span>
                );
            }
        },
        {
            headerName: '',
            width: 60,
            pinned: 'right', // Pin to right for better UX
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

    // Empty State
    if (!sessions || sessions.length === 0) {
        return (
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '3rem',
                textAlign: 'center',
                border: '1px solid #e2e8f0',
                marginTop: '2rem'
            }}>
                <h3 style={{ margin: 0, color: '#64748b' }}>No Sessions Found</h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>
                    Data for today will appear here.
                </p>
            </div>
        );
    }

    return (
        <div style={{
            marginTop: '0.5rem',
            height: 'calc(100vh - 220px)',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
            <AgGridReact
                rowData={rowData} // Use Processed Data
                columnDefs={colDefs}
                defaultColDef={defaultColDef}
                rowHeight={52}
                headerHeight={48}
                pagination={true}
                paginationPageSize={20}
                context={{ onEdit, onDelete }}
                // Header Row Config
                isFullWidthRow={isFullWidthRow}
                fullWidthCellRenderer={fullWidthCellRenderer}
            />
        </div>
    );
};

export default HistoryGrid;
