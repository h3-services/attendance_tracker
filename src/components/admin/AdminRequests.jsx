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
            width: 160,
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
            width: 160,
            pinned: 'right',
            headerClass: 'ag-header-cell-center',
            cellClass: 'ag-cell-center',
            cellRenderer: (params) => {
                const req = params.data;
                const isApproving = approving === req.recordId;

                return (
                    <div className="flex gap-2 items-center h-full justify-center w-full">
                        <button
                            onClick={() => handleApprove(req)}
                            disabled={isApproving}
                            title="Approve Request"
                            className="w-8 h-8 rounded-full border-none flex items-center justify-center bg-success text-white transition-all duration-200 hover:bg-emerald-600 cursor-pointer disabled:opacity-50"
                        >
                            {isApproving ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Check size={16} />
                            )}
                        </button>
                        <button
                            onClick={() => handleRejectClick(req.recordId)}
                            title="Reject Request"
                            className="w-8 h-8 rounded-full border-none flex items-center justify-center bg-danger text-white transition-all duration-200 hover:bg-red-600 cursor-pointer"
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



    return (
        <>
            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-[24px] border border-border-main shadow-sm">
                <div className="p-6 flex justify-between items-center border-b border-border-main bg-white shrink-0">
                    <h2 className="m-0 text-xl font-semibold text-text-main">Request Management</h2>
                    <div className="text-text-dim text-[0.9rem]">
                        {requests.length} Pending Request{requests.length !== 1 ? 's' : ''}
                    </div>
                </div>
                <div className="flex-1 w-full overflow-hidden mt-0">
                    <div className="ag-theme-alpine h-full w-full">
                        <AgGridReact
                            rowData={requests}
                            columnDefs={columnDefs}
                            defaultColDef={defaultColDef}
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
                            overlayNoRowsTemplate="<span style='padding: 1rem;'>No pending requests</span>"
                        />
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {rejectModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-2xl w-full max-auto max-w-[450px] shadow-lg relative animate-in scale-in-95 duration-200 text-center">
                        <h2 className="mt-0 text-xl font-bold">Confirm Rejection</h2>
                        <p className="text-text-dim mb-8">
                            Are you sure you want to delete this request? This action cannot be undone.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setRejectModalOpen(false)} className="px-4 py-2 rounded-lg font-semibold text-sm border border-border-main text-text-main hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">Cancel</button>
                            <button onClick={confirmReject} disabled={rejecting} className="px-4 py-2 bg-danger text-white rounded-lg font-semibold text-sm hover:bg-red-600 transition-all cursor-pointer">
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
