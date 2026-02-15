import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Admin = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user',
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      alert(t('accessDeniedAdminOnly'));
      window.location.href = '/';
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert(t('failedToFetchUsers'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update user (without password if not changed)
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await usersAPI.update(editingUser.id, updateData);
      } else {
        // Create new user
        await usersAPI.create(formData);
      }
      fetchUsers();
      closeModal();
      alert(editingUser ? t('successfullyUpdated') : t('successfullyCreated'));
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.error || t('failedToSave');
      alert(errorMessage);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm(t('confirmDeleteUser'))) return;
    
    try {
      await usersAPI.delete(userId);
      fetchUsers();
      alert(t('successfullyDeleted'));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(t('failedToDeleteUser'));
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await usersAPI.updateRole(userId, newRole);
      fetchUsers();
      alert(t('userRoleUpdatedSuccessfully'));
    } catch (error) {
      console.error('Error updating role:', error);
      alert(t('failedToUpdateUserRole'));
    }
  };

  const openModal = (userToEdit = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        email: userToEdit.email,
        password: '',
        full_name: userToEdit.full_name,
        role: userToEdit.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'user',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-800',
      user: 'bg-blue-100 text-blue-800',
      sales: 'bg-green-100 text-green-800',
    };
    return badges[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{t('userManagement')}</h1>
          <p className="text-gray-600 mt-2">{t('manageUsersSubtitle')}</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          + {t('createUser')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card bg-purple-50">
          <div className="text-sm text-gray-600">{t('totalUsers')}</div>
          <div className="text-2xl font-bold text-purple-600">{users.length}</div>
        </div>
        <div className="card bg-blue-50">
          <div className="text-sm text-gray-600">{t('regularUsers')}</div>
          <div className="text-2xl font-bold text-blue-600">
            {users.filter(u => u.role === 'user').length}
          </div>
        </div>
        <div className="card bg-green-50">
          <div className="text-sm text-gray-600">{t('salesTeam')}</div>
          <div className="text-2xl font-bold text-green-600">
            {users.filter(u => u.role === 'sales').length}
          </div>
        </div>
        <div className="card bg-gray-50">
          <div className="text-sm text-gray-600">{t('admins')}</div>
          <div className="text-2xl font-bold text-gray-600">
            {users.filter(u => u.role === 'admin').length}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">{t('name')}</th>
                <th className="text-left py-3 px-4">{t('email')}</th>
                <th className="text-left py-3 px-4">{t('role')}</th>
                <th className="text-left py-3 px-4">{t('created')}</th>
                <th className="text-left py-3 px-4">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500">
                    {t('noUsersFound')}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{u.full_name}</div>
                      {u.id === user.id && (
                        <span className="text-xs text-blue-600">({t('you')})</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{u.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs ${getRoleBadge(u.role)} border-0 cursor-pointer`}
                        disabled={u.id === user.id}
                      >
                        <option value="admin">🔐 {t('admin')}</option>
                        <option value="user">👤 {t('user')}</option>
                        <option value="sales">💼 {t('sales')}</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(u)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {t('edit')}
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            {t('delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Descriptions */}
      <div className="card bg-blue-50">
        <h3 className="font-semibold mb-3">{t('roleDescriptions')}</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">🔐 {t('admin')}:</span> {t('adminRoleDesc')}
          </div>
          <div>
            <span className="font-medium">👤 {t('user')}:</span> {t('userRoleDesc')}
          </div>
          <div>
            <span className="font-medium">💼 {t('sales')}:</span> {t('salesRoleDesc')}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">
              {editingUser ? t('editUser') : t('createUser')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fullName')} *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="input-field"
                  required
                  placeholder={t('placeholderFullName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('email')} *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                  required
                  placeholder={t('placeholderEmail')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('password')} {editingUser && `(${t('leaveBlankToKeepCurrent')})`}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field"
                  required={!editingUser}
                  placeholder={editingUser ? t('leaveBlankToKeepCurrent') : t('enterPassword')}
                  minLength={6}
                />
                {!editingUser && (
                  <p className="text-xs text-gray-500 mt-1">{t('min6Characters')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('role')} *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="user">👤 {t('user')}</option>
                  <option value="sales">💼 {t('sales')}</option>
                  <option value="admin">🔐 {t('admin')}</option>
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                <p className="text-yellow-800">
                  {t('createUserNote')}
                  {editingUser && ` ${t('passwordBlankKeepsCurrent')}`}
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? t('update') : t('create')} {t('user')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
