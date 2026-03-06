import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Arena from './pages/Arena';
import Dashboard from './pages/Dashboard';
import Problems from './pages/Problems';
import Leaderboard from './pages/Leaderboard';
import MockInterview from './pages/MockInterview';
import InterviewLobby from './pages/InterviewLobby';
import InterviewRoom from './pages/InterviewRoom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-slate-100 selection:bg-primary/30 flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/arena" element={<Arena />} />
            <Route path="/arena/:slug" element={<Arena />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/problems" element={<Problems />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/mock-interview" element={<MockInterview />} />
            <Route path="/interview" element={<InterviewLobby />} />
            <Route path="/interview/:roomId" element={<InterviewRoom />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;