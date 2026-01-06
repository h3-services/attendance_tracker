
import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

const HistoryGrid = ({ sessions, onEdit }) => {

    // Column Definitions
    const colDefs = useMemo(() => [
        {
            field: 'sessionNo',
            headerName: 'Session',
            width: 90,
            sortable: true,
            sort: 'asc', // Default Sort 1, 2, 3, 4
            comparator: (valueA, valueB) => {
                return (parseInt(valueA) || 0) - (parseInt(valueB) || 0);
            },
            // filter removed
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
            field: 'startTime',
            headerName: 'Start Time',
            width: 110,
            sortable: true,
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
            cellStyle: { display: 'flex', alignItems: 'center' } // Keep Left
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
            width: 120,
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
            headerName: 'Action',
            width: 90,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (p) => (
                <button
                    onClick={() => p.context.onEdit(p.data)}
                    style={{
                        padding: '6px 14px',
                        background: 'transparent',
                        color: '#2563EB',
                        border: '1px solid #2563EB',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                    }}
                >
                    Edit
                </button>
            ),
            sortable: false,
            filter: false
        }
    ], []);

    // Default Col Def
    const defaultColDef = useMemo(() => ({
        resizable: true,
        sortable: true,
        filter: false, // REMOVE FILTER COMPLETELY (and its icon)
        suppressMenu: true,
        cellStyle: { display: 'flex', alignItems: 'center' } // Vertical Center
    }), []);

    // Empty State (if needed, though Grid handles empty rows gracefully-ish)
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
            height: 'calc(100vh - 220px)', // Precise fit accounting for header + padding + nav
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
            <AgGridReact
                rowData={sessions}
                columnDefs={colDefs}
                defaultColDef={defaultColDef}
                rowHeight={52}
                headerHeight={48}
                pagination={true}
                paginationPageSize={10}
                paginationPageSizeSelector={[10, 20, 50, 100]}
                context={{ onEdit }}
            />
        </div>
    );
};

export default HistoryGrid;
