import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { createRecord, deleteAuthRecord, fetchData } from '../../api';
import { Check, Trash2 } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Register all community modules
ModuleRegistry.registerModules([AllCommunityModule]);

import Loader3D from '../common/Loader3D';

const AdminRequests = () => {
    const { requests, loading, updateRequests } = useOutletContext();
    const [approving, setApproving] = useState(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [recordToReject, setRecordToReject] = useState(null);
    const [rejecting, setRejecting] = useState(null);

    const handleApprove = async (record) => {
        setApproving(record.recordId);
        try {
            const existingData = await fetchData({ userName: record.userName });
            const sameDateSessions = existingData.filter(s => s.date === record.date);
            const maxSession = sameDateSessions.reduce((max, s) => Math.max(max, parseInt(s.sessionNo) || 0), 0);

            await createRecord({
                ...record,
                sessionNo: (maxSession + 1).toString(),
                status: record.status || 'Completed',
                approvedState: 'Completed',
                approvedBy: 'Admin'
            });

            await deleteAuthRecord(record.recordId);
            updateRequests(requests.filter(r => r.recordId !== record.recordId));
        } catch (error) {
            console.error('Approve failed:', error);
        } finally {
            setApproving(null);
        }
    };

    const handleRejectClick = (recordId) => {
        setRecordToReject(recordId);
        setRejectModalOpen(true);
    };

    const confirmReject = async () => {
        if (!recordToReject) return;
        setRejecting(recordToReject);
        try {
            await deleteAuthRecord(recordToReject, 'Requests');
            updateRequests(requests.filter(r => r.recordId !== recordToReject));
            setRejectModalOpen(false);
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setRejecting(null);
            setRecordToReject(null);
        }
    };

    // Column Definitions
    const columnDefs = useMemo(() => [

        {
            field: 'date',
            headerName: 'Date',
            width: 120,
            valueFormatter: (params) => {
                if (!params.value) return '';
                const date = new Date(params.value);
                if (isNaN(date.getTime())) return params.value;
                return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
            }
        },
        { field: 'userName', headerName: 'User', width: 150 },
        { field: 'startTime', headerName: 'Start', width: 120 },
        { field: 'endTime', headerName: 'End', width: 120 },
        {
            field: 'duration',
            headerName: 'Duration',
            width: 230,
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
        {
            field: 'workDescription',
            headerName: 'Description',
            flex: 2,
            cellRenderer: (params) => (
                <span title={params.value}>
                    {params.value?.substring(0, 30)}{params.value?.length > 30 ? '...' : ''}
                </span>
            )
        },
        {
            headerName: 'Actions',
            width: 150,
            flex: 2,
            pinned: 'right',
            headerClass: 'ag-header-cell-center',
            cellClass: 'ag-cell-center',
            cellRenderer: (params) => {
                const req = params.data;
                const isApproving = approving === req.recordId;

                return (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', height: '100%', justifyContent: 'center', width: '100%' }}>
                        <button
                            onClick={() => handleApprove(req)}
                            disabled={isApproving}
                            className="btn btn-success"
                            title="Approve Request"
                            style={{
                                padding: 0,
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {isApproving ? (
                                <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'white', borderLeftColor: 'rgba(255,255,255,0.3)' }}></div>
                            ) : (
                                <Check size={16} />
                            )}
                        </button>
                        <button
                            onClick={() => handleRejectClick(req.recordId)}
                            className="btn btn-danger"
                            title="Reject Request"
                            style={{
                                padding: 0,
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                );
            }
        },
    ], [approving]);

    const defaultColDef = useMemo(() => ({
        sortable: true,
        filter: false,
        resizable: true,
    }), []);

    if (loading) {
        return <Loader3D />;
    }

    if (requests.length === 0) {
        return <div style={{ textAlign: 'center', padding: '2rem' }}>No requests found</div>;
    }

    return (
        <>
            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: '#ffffff', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Request Management</h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {requests.length} Pending Request{requests.length !== 1 ? 's' : ''}
                </div>
            </div>
            <div className="table-container" style={{ height: '100%', width: '100%', overflow: 'hidden', marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
                    <AgGridReact
                        rowData={requests}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
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
                        overlayNoRowsTemplate="<span style='padding: 1rem;'>No pending requests</span>"
                    />
                </div>
            </div>

            {/* Reject Modal */}
            {rejectModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: 'center' }}>
                        <h2 style={{ marginTop: 0 }}>Confirm Rejection</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            Are you sure you want to delete this request? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                            <button onClick={() => setRejectModalOpen(false)} className="btn btn-outline">Cancel</button>
                            <button onClick={confirmReject} disabled={rejecting} className="btn btn-danger">
                                {rejecting ? 'Deleting...' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminRequests;
