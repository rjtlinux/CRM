import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

const Tenants = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      window.location.href = '/';
      return;
    }
    fetchTenants();
  }, [user]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/tenants');
      setTenants(res.data.tenants || []);
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          {t('tenants') || 'Tenant Management'}
        </h1>
        <p className="text-gray-600 mt-2">
          {t('tenantsSubtitle') || 'View and manage provisioned tenants'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-primary-50">
          <div className="text-sm text-gray-600">{t('tenants') || 'Tenants'}</div>
          <div className="text-2xl font-bold text-primary-600">{tenants.length}</div>
        </div>
        <div className="card bg-green-50">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-bold text-green-600">{tenants.length}</div>
        </div>
        <div className="card bg-amber-50">
          <div className="text-sm text-gray-600">Subdomains</div>
          <div className="text-2xl font-bold text-amber-600">*.buzeye.com</div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="card">
        <div className="overflow-x-auto">
          {tenants.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <p className="text-lg mb-2">No tenants provisioned yet</p>
              <p className="text-sm">
                Run <code className="bg-gray-100 px-2 py-1 rounded">./scripts/provision-tenant.sh</code> to add tenants
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Company</th>
                  <th className="text-left py-3 px-4">Slug</th>
                  <th className="text-left py-3 px-4">Subdomain</th>
                  <th className="text-left py-3 px-4">Admin Email</th>
                  <th className="text-left py-3 px-4">Ports</th>
                  <th className="text-left py-3 px-4">Link</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tnt, i) => (
                  <tr
                    key={i}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTenant(selectedTenant?.slug === tnt.slug ? null : tnt)}
                  >
                    <td className="py-3 px-4 font-medium">{tnt.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">{tnt.slug}</span>
                    </td>
                    <td className="py-3 px-4">{tnt.subdomain}</td>
                    <td className="py-3 px-4">{tnt.admin_email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      F:{tnt.frontend_port} B:{tnt.backend_port}
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`https://${tnt.subdomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Tenant Details Modal/Card */}
      {selectedTenant && (
        <div className="card bg-slate-50 border-2 border-primary-200">
          <h3 className="text-lg font-semibold mb-4">Tenant Details</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Company</dt>
              <dd className="font-medium">{selectedTenant.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Slug</dt>
              <dd><code className="bg-white px-2 py-1 rounded">{selectedTenant.slug}</code></dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Subdomain</dt>
              <dd><a href={`https://${selectedTenant.subdomain}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{selectedTenant.subdomain}</a></dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Admin Email</dt>
              <dd>{selectedTenant.admin_email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Frontend Port</dt>
              <dd>{selectedTenant.frontend_port}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Backend Port</dt>
              <dd>{selectedTenant.backend_port}</dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-3">
            <a
              href={`https://${selectedTenant.subdomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Open Tenant CRM
            </a>
            <button onClick={() => setSelectedTenant(null)} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      )}

      <div className="text-sm text-gray-500">
        <p>Tenants are provisioned via <code className="bg-gray-100 px-1 rounded">scripts/provision-tenant.sh</code>. Each tenant gets isolated database and containers.</p>
      </div>
    </div>
  );
};

export default Tenants;
