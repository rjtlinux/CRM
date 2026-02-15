import { useState, useEffect } from 'react';
import { followupsAPI, opportunitiesAPI, leadsAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Followups = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [followups, setFollowups] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState(null);
  const [filter, setFilter] = useState('all'); // all, upcoming, missed
  
  const [formData, setFormData] = useState({
    related_to: 'opportunity', // opportunity or lead
    opportunity_id: '',
    lead_id: '',
    assigned_to: '',
    followup_date: '',
    followup_type: 'call',
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let followupsRes;
      
      if (filter === 'upcoming') {
        followupsRes = await followupsAPI.getUpcoming(7);
      } else if (filter === 'missed') {
        followupsRes = await followupsAPI.getMissed();
      } else {
        followupsRes = await followupsAPI.getAll();
      }
      
      const [oppsRes, leadsRes, usersRes] = await Promise.all([
        opportunitiesAPI.getAll(),
        leadsAPI.getAll(),
        usersAPI.getAll().catch(() => ({ data: { users: [] } })),
      ]);
      
      setFollowups(followupsRes.data.followups || followupsRes.data.upcoming_followups || followupsRes.data.missed_followups || []);
      setOpportunities(oppsRes.data.opportunities);
      setLeads(leadsRes.data.leads);
      setUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        opportunity_id: formData.related_to === 'opportunity' ? formData.opportunity_id : null,
        lead_id: formData.related_to === 'lead' ? formData.lead_id : null,
      };

      if (editingFollowup) {
        await followupsAPI.update(editingFollowup.id, submitData);
      } else {
        await followupsAPI.create(submitData);
      }
      fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving follow-up:', error);
      alert(t('failedToSaveFollowup'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDeleteFollowup'))) return;
    
    try {
      await followupsAPI.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting follow-up:', error);
      alert(t('failedToDeleteFollowup'));
    }
  };

  const handleComplete = async (followup) => {
    try {
      await followupsAPI.update(followup.id, { ...followup, status: 'completed' });
      fetchData();
    } catch (error) {
      console.error('Error completing follow-up:', error);
      alert(t('failedToCompleteFollowup'));
    }
  };

  const openModal = (followup = null) => {
    if (followup) {
      setEditingFollowup(followup);
      setFormData({
        related_to: followup.opportunity_id ? 'opportunity' : 'lead',
        opportunity_id: followup.opportunity_id || '',
        lead_id: followup.lead_id || '',
        assigned_to: followup.assigned_to,
        followup_date: new Date(followup.followup_date).toISOString().slice(0, 16),
        followup_type: followup.followup_type,
        status: followup.status,
        notes: followup.notes || '',
      });
    } else {
      setEditingFollowup(null);
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      setFormData({
        related_to: 'opportunity',
        opportunity_id: '',
        lead_id: '',
        assigned_to: user?.id || '',
        followup_date: tomorrow.toISOString().slice(0, 16),
        followup_type: 'call',
        status: 'pending',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingFollowup(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      missed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getFollowupTypeIcon = (type) => {
    const icons = {
      call: '📞',
      email: '📧',
      meeting: '🤝',
      demo: '💻',
      followup: '🔄',
    };
    return icons[type] || '📝';
  };

  const missedCount = followups.filter(f => f.status === 'pending' && new Date(f.followup_date) < new Date()).length;
  const upcomingCount = followups.filter(f => f.status === 'pending' && new Date(f.followup_date) >= new Date()).length;
  const completedCount = followups.filter(f => f.status === 'completed').length;

  if (loading) {
    return <div className="text-center py-8">{t('loadingFollowups')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">{t('followups')}</h1>
        <button onClick={() => openModal()} className="btn-primary">
          + {t('scheduleFollowup')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div 
          className={`card cursor-pointer hover:shadow-lg transition-shadow ${filter === 'missed' ? 'bg-red-50 border-2 border-red-500' : 'bg-red-50'}`}
          onClick={() => setFilter('missed')}
        >
          <div className="text-sm text-gray-600">{t('missed')}</div>
          <div className="text-2xl font-bold text-red-600">{missedCount}</div>
        </div>
        <div 
          className={`card cursor-pointer hover:shadow-lg transition-shadow ${filter === 'upcoming' ? 'bg-blue-50 border-2 border-blue-500' : 'bg-blue-50'}`}
          onClick={() => setFilter('upcoming')}
        >
          <div className="text-sm text-gray-600">{t('upcoming')}</div>
          <div className="text-2xl font-bold text-blue-600">{upcomingCount}</div>
        </div>
        <div 
          className={`card cursor-pointer hover:shadow-lg transition-shadow ${filter === 'all' ? 'bg-gray-50 border-2 border-gray-500' : 'bg-gray-50'}`}
          onClick={() => setFilter('all')}
        >
          <div className="text-sm text-gray-600">{t('total')}</div>
          <div className="text-2xl font-bold text-gray-600">{followups.length}</div>
        </div>
        <div className="card bg-green-50">
          <div className="text-sm text-gray-600">{t('completed')}</div>
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
        </div>
      </div>

      {/* Followups List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">{t('type')}</th>
                <th className="text-left py-3 px-4">{t('relatedTo')}</th>
                <th className="text-left py-3 px-4">{t('assignedTo')}</th>
                <th className="text-left py-3 px-4">{t('followupDate')}</th>
                <th className="text-left py-3 px-4">{t('status')}</th>
                <th className="text-left py-3 px-4">{t('notes')}</th>
                <th className="text-left py-3 px-4">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {followups.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500">
                    {t('noFollowupsFound')}
                  </td>
                </tr>
              ) : (
                followups.map((followup) => {
                  const isPast = new Date(followup.followup_date) < new Date();
                  const isMissed = followup.status === 'pending' && isPast;
                  
                  return (
                    <tr 
                      key={followup.id} 
                      className={`border-b hover:bg-gray-50 ${isMissed ? 'bg-red-50' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-2">
                          <span className="text-2xl">{getFollowupTypeIcon(followup.followup_type)}</span>
                          <span className="capitalize">{t(followup.followup_type)}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{followup.related_to_name}</div>
                          <div className="text-xs text-gray-500 capitalize">{t(followup.related_type)}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{followup.assigned_to_name}</td>
                      <td className="py-3 px-4">
                        <div>
                          <div>{new Date(followup.followup_date).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(followup.followup_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(followup.status)}`}>
                          {isMissed ? t('missed').toUpperCase() : t(followup.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate">
                        {followup.notes || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {followup.status === 'pending' && (
                            <button
                              onClick={() => handleComplete(followup)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              ✓ {t('complete')}
                            </button>
                          )}
                          <button
                            onClick={() => openModal(followup)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {t('edit')}
                          </button>
                          <button
                            onClick={() => handleDelete(followup.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            {t('delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingFollowup ? t('editFollowup') : t('scheduleNewFollowup')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Related To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('relatedTo')} *
                  </label>
                  <select
                    name="related_to"
                    value={formData.related_to}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="opportunity">{t('opportunity')}</option>
                    <option value="lead">{t('lead')}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.related_to === 'opportunity' ? t('opportunity') : t('lead')} *
                  </label>
                  {formData.related_to === 'opportunity' ? (
                    <select
                      name="opportunity_id"
                      value={formData.opportunity_id}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      <option value="">{t('selectOpportunity')}</option>
                      {opportunities.map((opp) => (
                        <option key={opp.id} value={opp.id}>
                          {opp.title} - {opp.customer_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      name="lead_id"
                      value={formData.lead_id}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      <option value="">{t('selectLead')}</option>
                      {leads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.name} - {lead.company}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Follow-up Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('assignedTo')} *
                  </label>
                  <select
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="">{t('selectUser')}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('followupDateTime')} *
                  </label>
                  <input
                    type="datetime-local"
                    name="followup_date"
                    value={formData.followup_date}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('followupType')} *
                  </label>
                  <select
                    name="followup_type"
                    value={formData.followup_type}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="call">📞 {t('call')}</option>
                    <option value="email">📧 {t('email')}</option>
                    <option value="meeting">🤝 {t('meeting')}</option>
                    <option value="demo">💻 {t('demo')}</option>
                    <option value="followup">🔄 {t('followup')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('status')}
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="pending">{t('pending')}</option>
                    <option value="completed">{t('completed')}</option>
                    <option value="missed">{t('missed')}</option>
                    <option value="cancelled">{t('cancelled')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('notes')}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="input-field"
                  rows="4"
                  placeholder={t('followupNotesPlaceholder')}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {editingFollowup ? t('updateFollowup') : t('scheduleFollowup')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Followups;
