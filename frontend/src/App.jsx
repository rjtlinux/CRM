import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Opportunities from './pages/Opportunities';
import OpportunityTicket from './pages/OpportunityTicket';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import Costs from './pages/Costs';
import Proposals from './pages/Proposals';
import Reports from './pages/Reports';
import Followups from './pages/Followups';
import Admin from './pages/Admin';
import UdharKhata from './pages/UdharKhata';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="opportunities" element={<Opportunities />} />
        <Route path="opportunities/:id" element={<OpportunityTicket />} />
        <Route path="customers" element={<Customers />} />
        <Route path="sales" element={<Customers />} />
        <Route path="costs" element={<Costs />} />
        <Route path="proposals" element={<Proposals />} />
        <Route path="followups" element={<Followups />} />
        <Route path="udhar-khata" element={<UdharKhata />} />
        <Route path="reports" element={<Reports />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <AppRoutes />
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
