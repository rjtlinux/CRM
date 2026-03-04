import { useState, useEffect } from 'react';
import { leadsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianDate } from '../utils/indianFormatters';

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  proposal: 'bg-orange-100 text-orange-800',
  negotiation: 'bg-indigo-100 text-indigo-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

const sourceIcons = {
  website: '🌐',
  referral: '🤝',
  social_media: '📱',
  cold_call: '📞',
  exhibition: '🏪',
  indiamart: '🛒',
  whatsapp: '💬',
  other: '📋',
};

const defaultForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  position: '',
  status: 'new',
  lead_source: 'other',
  notes: '',
};

const Leads = () => {
  const { t } = useLanguage();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const [leadsRes, metricsRes] = await Promise.all([
        leadsAPI.getAll(params),
        leadsAPI.getMetrics().catch(() => ({ data: null })),
      ]);
      setLeads(leadsRes.data.leads || []);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingLead) {
        await leadsAPI.update(editingLead.id, formData);
      } else {
        await leadsAPI.create(formData);
      }
      setShowModal(false);
      setEditingLead(null);
      setFormData(defaultForm);
      fetchData();
    } catch (error) {
      console.error('Error saving lead:', error);
      alert(t('errorSaving') || 'Error saving lead. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      position: lead.position || '',
      status: lead.status || 'new',
      lead_source: lead.lead_source || 'other',
      notes: lead.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDelete') || 'Delete this lead?')) return;
    try {
      await leadsAPI.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
  const wonLeads = leads.filter(l => l.status === 'won').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {t('leads') || 'Leads'}
          </h1>
          <p className="text-gray-600 mt-1">{t('manageLeads') || 'Track and manage your potential customers'}</p>
        </div>
        <button
          onClick={() => { setEditingLead(null); setFormData(defaultForm); setShowModal(true); }}
          className="btn-primary"
        >
          + {t('addLead') || 'Add Lead'}
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('totalLeads') || 'Total Leads', value: totalLeads, color: 'bg-blue-500' },
          { label: t('newLeads') || 'New', value: newLeads, color: 'bg-purple-500' },
          { label: t('qualified') || 'Qualified', value: qualifiedLeads, color: 'bg-yellow-500' },
          { label: t('wonLeads') || 'Won', value: wonLeads, color: 'bg-green-500' },
        ].map((card) => (
          <div key={card.label} className="card text-center">
            <div className={`w-10 h-10 ${card.color} rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-2`}>
              {card.value}
            </div>
            <p className="text-sm text-gray-600">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {['all', 'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t(s) || s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Leads Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="text-center py-12 text-gray-500">{t('loading') || 'Loading...'}</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('noLeads') || 'No leads yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('addFirstLead') || 'Add your first lead to start tracking prospects'}
            </p>
            <button
              onClick={() => { setEditingLead(null); setFormData(defaultForm); setShowModal(true); }}
              className="btn-primary"
            >
              + {t('addLead') || 'Add Lead'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    t('name') || 'Name',
                    t('company') || 'Company',
                    t('phone') || 'Phone',
                    t('source') || 'Source',
                    t('status') || 'Status',
                    t('createdAt') || 'Added On',
                    t('actions') || 'Actions',
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{lead.name}</div>
                      {lead.email && <div className="text-xs text-gray-500">{lead.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{lead.company || '—'}</div>
                      {lead.position && <div className="text-xs text-gray-500">{lead.position}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="text-sm text-primary-600 hover:underline">
                          {lead.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg" title={lead.lead_source}>
                        {sourceIcons[lead.lead_source] || '📋'}
                      </span>
                      <span className="text-xs text-gray-500 ml-1 capitalize">
                        {(lead.lead_source || 'other').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                        {t(lead.status) || lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatIndianDate(lead.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(lead)}
                          className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                        >
                          {t('edit') || 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          {t('delete') || 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingLead ? (t('editLead') || 'Edit Lead') : (t('addLead') || 'Add Lead')}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('name') || 'Name'} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Ramesh Kumar"
                  className="input-field"
                />
              </div>

              {/* Company + Position */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('company') || 'Company'}
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Ramesh Traders"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('position') || 'Position'}
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="Owner"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('phone') || 'Phone'}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('email') || 'Email'}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ramesh@example.com"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Status + Source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('status') || 'Status'}
                  </label>
                  <select name="status" value={formData.status} onChange={handleChange} className="input-field">
                    {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map((s) => (
                      <option key={s} value={s}>{t(s) || s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leadSource') || 'Lead Source'}
                  </label>
                  <select name="lead_source" value={formData.lead_source} onChange={handleChange} className="input-field">
                    <option value="website">{t('website') || 'Website'}</option>
                    <option value="referral">{t('referral') || 'Referral'}</option>
                    <option value="social_media">{t('socialMedia') || 'Social Media'}</option>
                    <option value="cold_call">{t('coldCall') || 'Cold Call'}</option>
                    <option value="exhibition">{t('exhibition') || 'Exhibition'}</option>
                    <option value="indiamart">IndiaMART</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="other">{t('other') || 'Other'}</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('notes') || 'Notes'}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder={t('addNotes') || 'Add notes about this lead...'}
                  className="input-field resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingLead(null); setFormData(defaultForm); }}
                  className="btn-secondary flex-1"
                >
                  {t('cancel') || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
