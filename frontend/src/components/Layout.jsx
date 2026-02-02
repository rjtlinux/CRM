import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/opportunities', label: 'Opportunities', icon: '💼' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/sales', label: 'Sales', icon: '💰' },
    { path: '/costs', label: 'Costs', icon: '💳' },
    { path: '/proposals', label: 'Proposals', icon: '📄' },
    { path: '/followups', label: 'Follow-ups', icon: '🔔' },
    { path: '/reports', label: 'Reports', icon: '📈' },
  ];

  // Add Admin menu item only for admin users
  const allNavItems = user?.role === 'admin' 
    ? [...navItems, { path: '/admin', label: 'Admin', icon: '⚙️' }]
    : navItems;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-primary-600">CRM System</h1>
          <p className="text-sm text-gray-500 mt-1">Enterprise Edition</p>
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
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
