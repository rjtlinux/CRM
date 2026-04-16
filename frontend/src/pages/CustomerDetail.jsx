import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customersAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianCurrency, formatIndianDate } from '../utils/indianFormatters';
import SmartReminder from '../components/SmartReminder';

const TAB_OVERVIEW = 'overview';
const TAB_SALES = 'sales';
const TAB_UDHAR = 'udhar';
const TAB_OPPORTUNITIES = 'opportunities';
const TAB_FOLLOWUPS = 'followups';
const TAB_PROPOSALS = 'proposals';

const stageColors = {
  lead: 'bg-blue-100 text-blue-800',
  qualified: 'bg-purple-100 text-purple-800',
  proposal: 'bg-yellow-100 text-yellow-800',
  negotiation: 'bg-orange-100 text-orange-800',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-red-100 text-red-800',
};

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(TAB_OVERVIEW);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await customersAPI.getDetail(id);
      setData(res.data);
    } catch (e) {
      console.error('Error fetching customer detail:', e);
      setError('Customer not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card text-center py-16">
        <div className="text-5xl mb-4">😕</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Customer not found</h3>
        <button onClick={() => navigate('/customers')} className="btn-primary mt-4">
          ← Back to Customers
        </button>
      </div>
    );
  }

  const { customer, sales = [], udhar = [], total_outstanding = 0, opportunities = [], followups = [], proposals = [] } = data;
  const totalSalesValue = sales.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const completedSales = sales.filter(s => s.status === 'completed');

  const tabs = [
    { key: TAB_OVERVIEW, label: 'Overview', icon: '📋' },
    { key: TAB_UDHAR, label: `Credit Book (${udhar.length})`, icon: '📕' },
    { key: TAB_SALES, label: `Sales (${sales.length})`, icon: '💰' },
    { key: TAB_OPPORTUNITIES, label: `Opportunities (${opportunities.length})`, icon: '💼' },
    { key: TAB_FOLLOWUPS, label: `Follow-ups (${followups.length})`, icon: '🔔' },
    { key: TAB_PROPOSALS, label: `Proposals (${proposals.length})`, icon: '📄' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700 text-2xl font-bold flex-shrink-0 mt-1"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">{customer.company_name}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
              customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {customer.status}
            </span>
          </div>
          <p className="text-gray-500 mt-1 text-sm truncate">
            {customer.contact_person}
            {customer.contact_designation && ` · ${customer.contact_designation}`}
          </p>
        </div>
        <div className="flex-shrink-0">
          <SmartReminder
            customerId={customer.id}
            customerName={customer.company_name}
            outstanding={total_outstanding}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-green-50 border-l-4 border-green-500">
          <div className="text-xs text-gray-500 mb-1">Total Sales</div>
          <div className="text-xl font-bold text-green-700">{formatIndianCurrency(totalSalesValue)}</div>
          <div className="text-xs text-gray-500">{completedSales.length} completed</div>
        </div>
        <div className="card bg-red-50 border-l-4 border-red-500">
          <div className="text-xs text-gray-500 mb-1">Outstanding (Udhar)</div>
          <div className="text-xl font-bold text-red-700">{formatIndianCurrency(total_outstanding)}</div>
          <div className="text-xs text-gray-500">{udhar.length} pending bills</div>
        </div>
        <div className="card bg-blue-50 border-l-4 border-blue-500">
          <div className="text-xs text-gray-500 mb-1">Opportunities</div>
          <div className="text-xl font-bold text-blue-700">{opportunities.length}</div>
          <div className="text-xs text-gray-500">
            {formatIndianCurrency(opportunities.reduce((s, o) => s + parseFloat(o.value || 0), 0))} pipeline
          </div>
        </div>
        <div className="card bg-purple-50 border-l-4 border-purple-500">
          <div className="text-xs text-gray-500 mb-1">Follow-ups</div>
          <div className="text-xl font-bold text-purple-700">{followups.length}</div>
          <div className="text-xs text-gray-500">
            {followups.filter(f => f.status === 'pending').length} pending
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}

      {/* OVERVIEW */}
      {activeTab === TAB_OVERVIEW && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">Contact Information</h3>
            <div className="space-y-3">
              {[
                { label: 'Company', value: customer.company_name },
                { label: 'Contact Person', value: customer.contact_person },
                { label: 'Designation', value: customer.contact_designation },
                { label: 'Email', value: customer.email },
                { label: 'Phone', value: customer.phone },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
                  <span className="text-sm font-medium text-gray-900 text-right max-w-[60%] truncate">{value}</span>
                </div>
              ) : null)}
            </div>
          </div>
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">Business Details</h3>
            <div className="space-y-3">
              {[
                { label: 'Sector', value: customer.sector },
                { label: 'Business Type', value: customer.business_type },
                { label: 'Company Size', value: customer.company_size },
                { label: 'Address', value: [customer.address, customer.city, customer.pincode].filter(Boolean).join(', ') },
                { label: 'Country', value: customer.country },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
                  <span className="text-sm font-medium text-gray-900 text-right max-w-[60%] truncate">{value}</span>
                </div>
              ) : null)}
            </div>
          </div>
        </div>
      )}

      {/* CREDIT BOOK / UDHAR */}
      {activeTab === TAB_UDHAR && (
        <div className="card">
          {udhar.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">🎉</div>
              <p>No outstanding credit for this customer</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">Outstanding Credit Entries</h3>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total Outstanding</div>
                  <div className="text-xl font-bold text-red-600">{formatIndianCurrency(total_outstanding)}</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Bill #', 'Date', 'Description', 'Amount', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {udhar.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{entry.invoice_number || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatIndianDate(entry.sale_date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{entry.description || '—'}</td>
                        <td className="px-4 py-3 font-bold text-red-600">{formatIndianCurrency(entry.amount)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            Pending
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* SALES */}
      {activeTab === TAB_SALES && (
        <div className="card">
          {sales.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">💰</div>
              <p>No sales recorded for this customer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Invoice #', 'Date', 'Description', 'Amount', 'Payment', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{sale.invoice_number || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatIndianDate(sale.sale_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{sale.description || '—'}</td>
                      <td className="px-4 py-3 font-bold text-green-700">{formatIndianCurrency(sale.amount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{(sale.payment_method || '—').replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sale.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* OPPORTUNITIES */}
      {activeTab === TAB_OPPORTUNITIES && (
        <div className="card">
          {opportunities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">💼</div>
              <p>No opportunities for this customer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map(opp => (
                <div
                  key={opp.id}
                  className="flex justify-between items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/opportunities/${opp.id}`)}
                >
                  <div>
                    <div className="font-medium text-gray-900">{opp.title}</div>
                    <div className="text-sm text-gray-500 mt-1">{opp.description}</div>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColors[opp.pipeline_stage] || 'bg-gray-100 text-gray-700'}`}>
                        {(opp.pipeline_stage || '').replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{opp.closing_probability}% probability</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-bold text-gray-900">{formatIndianCurrency(opp.value)}</div>
                    {opp.expected_close_date && (
                      <div className="text-xs text-gray-500">{formatIndianDate(opp.expected_close_date)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FOLLOWUPS */}
      {activeTab === TAB_FOLLOWUPS && (
        <div className="card">
          {followups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">🔔</div>
              <p>No follow-ups for this customer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followups.map(f => (
                <div key={f.id} className="flex justify-between items-start p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 capitalize">{f.followup_type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        f.status === 'completed' ? 'bg-green-100 text-green-800' :
                        f.status === 'missed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {f.status}
                      </span>
                    </div>
                    {f.notes && <p className="text-sm text-gray-600 mt-1">{f.notes}</p>}
                    <p className="text-xs text-gray-500 mt-1">Assigned to: {f.assigned_to_name || '—'}</p>
                  </div>
                  <div className="text-sm text-gray-500 ml-4 text-right">
                    {formatIndianDate(f.followup_date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PROPOSALS */}
      {activeTab === TAB_PROPOSALS && (
        <div className="card">
          {proposals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">📄</div>
              <p>No proposals for this customer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Proposal #', 'Title', 'Amount', 'Valid Until', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proposals.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{p.proposal_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{p.title}</td>
                      <td className="px-4 py-3 font-bold text-green-700">{formatIndianCurrency(p.total_amount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {p.valid_until ? formatIndianDate(p.valid_until) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          p.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          p.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          p.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;
