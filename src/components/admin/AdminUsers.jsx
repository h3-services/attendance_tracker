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
            alert('User created successfully!');
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
            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: '#ffffff', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>User Management</h2>
                <button
                    onClick={() => setAddUserModalOpen(true)}
                    className="btn btn-primary"
                    style={{
                        padding: '0.6rem 1.25rem',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: 'var(--shadow-md)',
                        borderRadius: '2rem'
                    }}
                >
                    <Plus size={18} /> Add New User
                </button>
            </div>
            <div className="table-container" style={{ height: '100%', width: '100%', overflow: 'hidden', marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
                    <AgGridReact
                        rowData={users}
                        columnDefs={[
                            { field: 'name', headerName: 'Name', flex: 1, filter: false },
                            { field: 'email', headerName: 'Email', flex: 1.5, filter: false },
                            {
                                field: 'role',
                                headerName: 'Role',
                                width: 120,
                                cellRenderer: (params) => (
                                    <span className={`badge ${String(params.value).toLowerCase() === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                                        {params.value ? params.value.charAt(0).toUpperCase() + params.value.slice(1).toLowerCase() : ''}
                                    </span>
                                )
                            },
                            {
                                field: 'createdAt',
                                headerName: 'Joined',
                                width: 150,
                                valueFormatter: (params) => {
                                    if (!params.value) return '';
                                    const date = new Date(params.value);
                                    if (isNaN(date.getTime())) return params.value; // Return original if invalid date
                                    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                                }
                            },
                            {
                                headerName: 'Actions',
                                width: 120,
                                headerClass: 'ag-header-cell-center',
                                cellClass: 'ag-cell-center',
                                cellRenderer: (params) => (
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', width: '100%' }}>
                                        <button
                                            onClick={() => handleEditClick(params.data)}
                                            className="btn btn-ghost"
                                            title="Edit User"
                                            style={{
                                                padding: 0,
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--primary-color)',
                                                background: '#eff6ff'
                                            }}
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(params.data.recordId)}
                                            className="btn btn-danger"
                                            title="Delete User"
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
                        rowHeight={60}
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

            {/* Add User Modal */}
            {addUserModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Add New User</h2>
                        <form onSubmit={handleAddUser}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Name</label>
                                <input
                                    className="input-field"
                                    type="text" required
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    style={{ width: '93%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Email</label>
                                <input
                                    type="email" required
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    style={{ width: '93%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Password</label>
                                <input
                                    type="text" required
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    style={{ width: '93%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setAddUserModalOpen(false)} className="btn btn-outline">Cancel</button>
                                <button type="submit" disabled={newUserLoading} className="btn btn-primary">
                                    {newUserLoading ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {rejectModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '1rem', color: 'var(--warning-color)', display: 'flex', justifyContent: 'center' }}>
                            <ShieldCheck size={48} />
                        </div>
                        <h2 style={{ marginTop: 0 }}>Confirm Deletion</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            Are you sure you want to delete this user? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                            <button onClick={() => setRejectModalOpen(false)} className="btn btn-outline">Cancel</button>
                            <button onClick={confirmDelete} disabled={deleting} className="btn btn-danger">
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editUserModalOpen && editingUser && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Edit User</h2>
                        <form onSubmit={handleUpdateUser}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Name</label>
                                <input
                                    className="input-field"
                                    type="text" required
                                    value={editingUser.name}
                                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                    style={{ width: '93%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Email</label>
                                <input
                                    type="email" required
                                    value={editingUser.email}
                                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                    style={{ width: '93%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Password (New)</label>
                                <input
                                    type="text"
                                    placeholder="Leave blank to keep current"
                                    value={editingUser.password}
                                    onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                    style={{ width: '93%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Role</label>
                                <select
                                    value={editingUser.role}
                                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setEditUserModalOpen(false)} className="btn btn-outline">Cancel</button>
                                <button type="submit" disabled={updating} className="btn btn-primary">
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
