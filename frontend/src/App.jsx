import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Arena from './pages/Arena';
import Dashboard from './pages/Dashboard';
import Problems from './pages/Problems';
import Leaderboard from './pages/Leaderboard';
import MockInterview from './pages/MockInterview';
import InterviewLobby from './pages/InterviewLobby';
import InterviewRoom from './pages/InterviewRoom';
import AdminDashboard from './pages/AdminDashboard';
import SSOCallback from './pages/SSOCallback';
import { ClerkProvider, useUser } from '@clerk/clerk-react';

// Retrieve Clerk key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn("Missing Publishable Key");
}

function getRole(user) {
  return user?.publicMetadata?.role || 'User';
}

function AdminRoute({ children }) {
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded) return <div className="min-h-screen bg-background text-white flex items-center justify-center">Loading...</div>;
  if (!isSignedIn) return <Navigate to="/login" replace />;
  return getRole(user) === 'Admin' ? children : <Navigate to="/dashboard" replace />;
}

function UserRoute({ children }) {
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded) return <div className="min-h-screen bg-background text-white flex items-center justify-center">Loading...</div>;
  if (!isSignedIn) return <Navigate to="/login" replace />;
  return getRole(user) === 'Admin' ? <Navigate to="/admin" replace /> : children;
}
// ────────────────────────────────────────────────────────────────────

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <BrowserRouter>
      <div className="h-screen bg-background text-slate-100 selection:bg-primary/30 flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-none">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/sso-callback" element={<SSOCallback />} />

            {/* User-only routes — admins get bounced to /admin */}
            <Route path="/dashboard"     element={<UserRoute><Dashboard /></UserRoute>} />
            <Route path="/arena"         element={<UserRoute><Arena /></UserRoute>} />
            <Route path="/arena/:slug"   element={<UserRoute><Arena /></UserRoute>} />
            <Route path="/problems"      element={<UserRoute><Problems /></UserRoute>} />
            <Route path="/leaderboard"   element={<UserRoute><Leaderboard /></UserRoute>} />
            <Route path="/mock-interview" element={<UserRoute><MockInterview /></UserRoute>} />
            <Route path="/interview"     element={<UserRoute><InterviewLobby /></UserRoute>} />
            <Route path="/interview/:roomId" element={<UserRoute><InterviewRoom /></UserRoute>} />

            {/* Admin-only routes — non-admins get bounced to /dashboard */}
            <Route path="/admin" element={<AdminRoute><Navigate to="/admin/analytics" replace /></AdminRoute>} />
            <Route path="/admin/:tab" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
    </ClerkProvider>
  );
}

export default App;