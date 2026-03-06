import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Code2, LayoutDashboard, Target, Users, Flame, LogOut, CodeSquare, BookOpen, Trophy, Zap } from 'lucide-react';
import axios from 'axios';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  let user = {};
  try {
    const userStr = localStorage.getItem('user');
    if (userStr && userStr !== 'undefined') {
      user = JSON.parse(userStr);
    }
  } catch (e) {
    console.error('Failed to parse user from local storage:', e);
  }
  
  // Do not show navbar on auth screens or landing page
  if (['/', '/login', '/register'].includes(location.pathname)) {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const [liveStats, setLiveStats] = useState({ xp: 0, streak: 0, level: 1 });

  useEffect(() => {
    const fetchStats = async () => {
      const t = localStorage.getItem('token');
      if (!t) return;
      try {
        const res = await axios.get('http://localhost:5000/api/v1/users/me/stats', {
          headers: { Authorization: `Bearer ${t}` }
        });
        setLiveStats({ xp: res.data.xp || 0, streak: res.data.streak || 0, level: res.data.level || 1 });
      } catch { /* silent */ }
    };
    fetchStats();
  }, []);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/arena', label: 'Practice', icon: Target },
    { path: '/problems', label: 'Problems', icon: BookOpen },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/interview', label: 'Interview', icon: Users },
  ];

  return (
    <nav className="h-16 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between shrink-0">
      
      {/* Brand */}
      <Link to="/dashboard" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all">
          <CodeSquare className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white group-hover:text-primary transition-colors">
          CodeArena
        </span>
      </Link>

      {/* Primary Navigation Links */}
      <div className="hidden md:flex items-center gap-2 bg-surface/30 px-2 py-1.5 rounded-2xl border border-white/5 mx-8">
        {navLinks.map((link) => {
          const isActive = location.pathname.startsWith(link.path.split('/')[1] ? `/${link.path.split('/')[1]}` : link.path);
          const Icon = link.icon;
          return (
            <Link 
              key={link.path} 
              to={link.path}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
              {link.label}
              {isActive && (
                <motion.div 
                  layoutId="navbar-indicator"
                  className="absolute inset-0 bg-white/10 rounded-xl pointer-events-none border border-white/10 shadow-[inner_0_0_10px_rgba(255,255,255,0.05)]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-6">
        {token ? (
          <>
            {/* Gamification Quick Stats - real data */}
            <div className="hidden lg:flex items-center gap-4 bg-surface/50 border border-white/5 rounded-xl px-4 py-1.5 h-10">
              <div className="flex items-center gap-1.5 text-orange-500 font-bold text-sm" title="Day Streak">
                <Flame className="w-4 h-4 fill-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                {liveStats.streak}
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-1.5 text-primary font-bold text-sm" title="Total XP">
                <Zap className="w-4 h-4" />
                {liveStats.xp.toLocaleString()} <span className="text-[10px] text-slate-400 font-medium">XP</span>
              </div>
            </div>

            {/* Profile Menu Dropdown simulation */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-white">{user.username || 'Developer'}</div>
                <div className="text-xs text-primary font-medium">Lvl {liveStats.level}</div>
              </div>
               <button 
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl bg-surface hover:bg-red-500/10 hover:text-red-400 border border-white/10 hover:border-red-500/30 flex items-center justify-center transition-all group"
                title="Sign Out"
               >
                 <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-400 transition-colors" />
               </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Sign In</Link>
            <Link to="/register" className="px-5 py-2 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              Create Account
            </Link>
          </div>
        )}
      </div>

    </nav>
  );
}
