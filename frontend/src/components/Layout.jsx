import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitch from './LanguageSwitch';
import MobileBottomNav from './MobileBottomNav';

const Layout = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: t('dashboard'), icon: '📊' },
    { path: '/udhar-khata', label: t('udharKhata'), icon: '📕' },
    { path: '/opportunities', label: t('opportunities'), icon: '💼' },
    { path: '/customers', label: t('customers'), icon: '👥' },
    { path: '/sales', label: t('sales'), icon: '💰' },
    { path: '/costs', label: t('costs'), icon: '💳' },
    { path: '/proposals', label: t('proposals'), icon: '📄' },
    { path: '/followups', label: t('followups'), icon: '🔔' },
    { path: '/reports', label: t('reports'), icon: '📈' },
  ];

  // Add Admin menu item only for admin users
  const allNavItems = user?.role === 'admin' 
    ? [...navItems, { path: '/admin', label: t('admin'), icon: '⚙️' }]
    : navItems;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex md:w-64 bg-white shadow-lg flex-col">
        <div className="p-6 border-b bg-gradient-to-br from-primary-50 to-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/10 rounded-lg blur-md"></div>
              <div className="relative bg-white p-2 rounded-lg shadow-md ring-2 ring-primary-500/20">
                <img src="/buzeye-logo.png" alt="Buzeye" className="h-8 w-8" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                Buzeye
              </h1>
              <p className="text-xs text-gray-600 font-medium">Business CRM</p>
            </div>
          </div>
          <div className="mt-3">
            <LanguageSwitch />
          </div>
        </div>
        
        <nav className="p-4">
          {allNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{user?.full_name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              <span className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${
                user?.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                user?.role === 'sales' ? 'bg-green-100 text-green-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {user?.role === 'admin' ? '🔐 Admin' : 
                 user?.role === 'sales' ? '💼 Sales' : '👤 User'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full btn-secondary text-sm"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/10 rounded-lg blur-md"></div>
              <div className="relative bg-white p-1.5 rounded-lg shadow-md ring-2 ring-primary-500/20">
                <img src="/buzeye-logo.png" alt="Buzeye" className="h-6 w-6" />
              </div>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              Buzeye
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Page Content - Mobile optimized padding */}
        <div className="p-4 md:p-8 pb-20 md:pb-8">
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </main>
    </div>
  );
};

export default Layout;
