import { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Outlet,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import HomePage from './pages/HomePage';
import MarketplacePage from './pages/MarketplacePage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import CreateListingPage from './pages/CreateListingPage';
import MyListingsPage from './pages/MyListingsPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import InterestInboxPage from './pages/InterestInboxPage';
import PaymentSimulationPage from './pages/PaymentSimulationPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import ChatPage from './pages/ChatPage';
import NotFoundPage from './pages/NotFoundPage';

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

// Layout wrapper including persistent Navbar and Footer
function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-700">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Main Layout containing persistent Navbar and Footer */}
          <Route element={<MainLayout />}>
            {/* Public Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/product/:id" element={<ProductDetailsPage />} />

            {/* Authenticated Student/User Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<StudentDashboardPage />} />
              <Route path="/create-listing" element={<CreateListingPage />} />
              <Route path="/my-listings" element={<MyListingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/interests" element={<InterestInboxPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat/:conversationId" element={<ChatPage />} />
              <Route path="/payment/:interestId" element={<PaymentSimulationPage />} />
              <Route path="/transactions" element={<TransactionHistoryPage />} />
            </Route>

            {/* Admin-Only Route */}
            <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Route>

            {/* Legacy route redirects for backward compatibility */}
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/listings" element={<Navigate to="/my-listings" replace />} />
            <Route path="/saved-items" element={<Navigate to="/dashboard" replace />} />
            <Route path="/orders" element={<Navigate to="/transactions" replace />} />
            <Route path="/settings" element={<Navigate to="/profile" replace />} />

            {/* 404 Catch-All Page */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Dedicated Standalone Fullscreen Auth Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
