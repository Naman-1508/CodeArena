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

// ── Role Guards ──────────────────────────────────────────────────────
function getRole() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.role || 'User';
  } catch {
    return 'User';
  }
}

/** Only admins can access admin routes — others go to /dashboard */
function AdminRoute({ children }) {
  return getRole() === 'Admin' ? children : <Navigate to="/dashboard" replace />;
}

/** Normal users only — admins are always redirected to /admin */
function UserRoute({ children }) {
  return getRole() === 'Admin' ? <Navigate to="/admin" replace /> : children;
}
// ────────────────────────────────────────────────────────────────────

function App() {
  return (
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
  );
}

export default App;