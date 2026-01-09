import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { registerUser, deleteAuthRecord, updateUser } from '../../api';
import { Plus, X, ShieldCheck, Pencil, Trash2 } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Register all community modules
ModuleRegistry.registerModules([AllCommunityModule]);

import Loader3D from '../common/Loader3D';

const AdminUsers = () => {
    const { users, loading, updateUsers } = useOutletContext();
    const [addUserModalOpen, setAddUserModalOpen] = useState(false);
    const [newUserLoading, setNewUserLoading] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [editUserModalOpen, setEditUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [updating, setUpdating] = useState(false);

    const handleAddUser = async (e) => {
        e.preventDefault();
        setNewUserLoading(true);
        try {
            const response = await registerUser(newUser.email, newUser.password, newUser.name, newUser.role);
            const today = new Date();
            const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

            updateUsers([...users, {
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                createdAt: formattedDate,
                recordId: response.recordId || Date.now().toString()
            }]);

            setAddUserModalOpen(false);
            setNewUser({ name: '', email: '', password: '', role: 'user' });
        } catch (error) {
            alert(`Failed to create user: ${error.message}`);
        } finally {
            setNewUserLoading(false);
        }
    };

    const handleEditClick = (user) => {
        setEditingUser({ ...user, password: '' }); // Don't pre-fill password, assume blank means unchanged if backend supports it
        setEditUserModalOpen(true);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;
        setUpdating(true);
        try {
            // Only send password if it's not empty, otherwise keep existing
            // Note: The API must support this. For now passing as is.
            await updateUser(editingUser.recordId, editingUser.email, editingUser.name, editingUser.role, editingUser.password);

            updateUsers(users.map(u => u.recordId === editingUser.recordId ? { ...u, ...editingUser, password: u.password } : u)); // Don't expose password in local state potentially
            setEditUserModalOpen(false);
            setEditingUser(null);
        } catch (error) {
            alert(`Failed to update user: ${error.message}`);
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteClick = (userId) => {
        setUserToDelete(userId);
        setRejectModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setDeleting(true);
        try {
            await deleteAuthRecord(userToDelete, 'Users');
            updateUsers(users.filter(u => u.recordId !== userToDelete));
            setRejectModalOpen(false);
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setDeleting(false);
            setUserToDelete(null);
        }
    };

    if (loading) {
        return <Loader3D />;
    }

    return (
        <>
            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-[24px] border border-border-main shadow-sm">
                <div className="p-6 flex justify-between items-center border-b border-border-main bg-white shrink-0">
                    <h2 className="m-0 text-xl font-semibold text-text-main">User Management</h2>
                    <button
                        onClick={() => setAddUserModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[0.95rem] font-semibold rounded-full shadow-md hover:bg-slate-800 transition-all cursor-pointer border-none"
                    >
                        <Plus size={18} /> Add New User
                    </button>
                </div>
                <div className="flex-1 w-full overflow-hidden mt-0">
                    <div className="ag-theme-alpine h-full w-full">
                        <AgGridReact
                            rowData={users}
                            columnDefs={[
                                { field: 'name', headerName: 'Name', flex: 1, filter: false },
                                { field: 'email', headerName: 'Email', flex: 1.5, filter: false },
                                {
                                    field: 'role',
                                    headerName: 'Role',
                                    width: 120,
                                    cellRenderer: (params) => {
                                        const role = String(params.value).toLowerCase();
                                        return (
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[0.75rem] font-semibold leading-none
                                                ${role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {params.value ? params.value.charAt(0).toUpperCase() + params.value.slice(1).toLowerCase() : ''}
                                            </span>
                                        );
                                    }
                                },
                                {
                                    field: 'createdAt',
                                    headerName: 'Joined',
                                    width: 150,
                                    valueFormatter: (params) => {
                                        if (!params.value) return '';
                                        const date = new Date(params.value);
                                        if (isNaN(date.getTime())) return params.value;
                                        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                                    }
                                },
                                {
                                    headerName: 'Actions',
                                    width: 120,
                                    headerClass: 'ag-header-cell-center',
                                    cellClass: 'ag-cell-center',
                                    cellRenderer: (params) => (
                                        <div className="flex gap-2 justify-center w-full">
                                            <button
                                                onClick={() => handleEditClick(params.data)}
                                                title="Edit User"
                                                className="w-8 h-8 rounded-full border-none flex items-center justify-center bg-blue-50 text-blue-600 transition-all duration-200 hover:bg-blue-100 cursor-pointer"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(params.data.recordId)}
                                                title="Delete User"
                                                className="w-8 h-8 rounded-full border-none flex items-center justify-center bg-danger text-white transition-all duration-200 hover:bg-red-600 cursor-pointer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )
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
                        />
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            {addUserModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-2xl w-full max-auto max-w-[450px] shadow-lg relative animate-in scale-in-95 duration-200">
                        <h2 className="mt-0 mb-6 text-xl font-bold">Add New User</h2>
                        <form onSubmit={handleAddUser}>
                            <div className="mb-4">
                                <label className="block mb-2 text-sm font-semibold">Name</label>
                                <input
                                    type="text" required
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-border-main outline-none focus:border-primary transition-all"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block mb-2 text-sm font-semibold">Email</label>
                                <input
                                    type="email" required
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-border-main outline-none focus:border-primary transition-all"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block mb-2 text-sm font-semibold">Password</label>
                                <input
                                    type="text" required
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-border-main outline-none focus:border-primary transition-all"
                                />
                            </div>
                            <div className="mb-8">
                                <label className="block mb-2 text-sm font-semibold">Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-border-main outline-none focus:border-primary transition-all appearance-none bg-white"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setAddUserModalOpen(false)} className="px-4 py-2 rounded-lg font-semibold text-sm border border-border-main text-text-main hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">Cancel</button>
                                <button type="submit" disabled={newUserLoading} className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-all cursor-pointer">
                                    {newUserLoading ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {rejectModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-2xl w-full max-auto max-w-[450px] shadow-lg relative animate-in scale-in-95 duration-200 text-center">
                        <div className="mb-4 text-warning flex justify-center">
                            <ShieldCheck size={48} />
                        </div>
                        <h2 className="mt-0 text-xl font-bold">Confirm Deletion</h2>
                        <p className="text-text-dim mb-8">
                            Are you sure you want to delete this user? This action cannot be undone.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setRejectModalOpen(false)} className="px-4 py-2 rounded-lg font-semibold text-sm border border-border-main text-text-main hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">Cancel</button>
                            <button onClick={confirmDelete} disabled={deleting} className="px-4 py-2 bg-danger text-white rounded-lg font-semibold text-sm hover:bg-red-600 transition-all cursor-pointer">
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editUserModalOpen && editingUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-2xl w-full max-auto max-w-[450px] shadow-lg relative animate-in scale-in-95 duration-200">
                        <h2 className="mt-0 mb-6 text-xl font-bold">Edit User</h2>
                        <form onSubmit={handleUpdateUser}>
                            <div className="mb-4">
                                <label className="block mb-2 text-sm font-semibold">Name</label>
                                <input
                                    type="text" required
                                    value={editingUser.name}
                                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-border-main outline-none focus:border-primary transition-all"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block mb-2 text-sm font-semibold">Email</label>
                                <input
                                    type="email" required
                                    value={editingUser.email}
                                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-border-main outline-none focus:border-primary transition-all"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block mb-2 text-sm font-semibold">Password (New)</label>
                                <input
                                    type="text"
                                    placeholder="Leave blank to keep current"
                                    value={editingUser.password}
                                    onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-border-main outline-none focus:border-primary transition-all"
                                />
                            </div>
                            <div className="mb-8">
                                <label className="block mb-2 text-sm font-semibold">Role</label>
                                <select
                                    value={editingUser.role}
                                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-border-main outline-none focus:border-primary transition-all appearance-none bg-white"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setEditUserModalOpen(false)} className="px-4 py-2 rounded-lg font-semibold text-sm border border-border-main text-text-main hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">Cancel</button>
                                <button type="submit" disabled={updating} className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-all cursor-pointer">
                                    {updating ? 'Updating...' : 'Update User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminUsers;
