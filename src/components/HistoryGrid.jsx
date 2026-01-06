
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
            filter: true
        },
        {
            field: 'startTime',
            headerName: 'Start Time',
            width: 110,
            sortable: true,
            valueFormatter: (p) => {
                if (!p.value) return '-';
                // Handle ISO Date Strings (1899-12-30T...)
                let d;
                if (String(p.value).includes('T')) {
                    d = new Date(p.value);
                } else {
                    // Handle "14:30" string by creating a dummy date
                    const [h, m] = String(p.value).split(':');
                    d = new Date();
                    d.setHours(h || 0, m || 0);
                }

                if (!isNaN(d.getTime())) {
                    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }); // 2:30 PM
                }
                return p.value;
            }
        },
        {
            field: 'endTime',
            headerName: 'End Time',
            width: 110,
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
            valueFormatter: (p) => p.value ? p.value : '-'
        },
        {
            field: 'workDescription',
            headerName: 'Description',
            flex: 2,
            minWidth: 200,
            wrapText: true,
            autoHeight: true
        },
        {
            field: 'project',
            headerName: 'Project',
            width: 120
        },
        {
            field: 'category',
            headerName: 'Category',
            width: 120
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 130,
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
            cellRenderer: (p) => {
                const s = String(p.value || 'Pending').toLowerCase();
                const isApproved = s === 'approved';
                return (
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: isApproved ? '#ecfdf5' : '#fefce8',
                        color: isApproved ? '#059669' : '#d97706',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        border: `1px solid ${isApproved ? '#a7f3d0' : '#fde68a'}`
                    }}>
                        {p.value || 'Pending'}
                    </span>
                );
            }
        },
        {
            headerName: 'Action',
            width: 90,
            cellRenderer: (p) => (
                <button
                    onClick={() => p.context.onEdit(p.data)}
                    style={{
                        padding: '4px 12px',
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600
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
        filter: true,
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
            marginTop: '2rem',
            height: '400px', // Fixed height for scrolling
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
                rowHeight={48}
                pagination={true}
                paginationPageSize={10}
                context={{ onEdit }}
            />
        </div>
    );
};

export default HistoryGrid;
