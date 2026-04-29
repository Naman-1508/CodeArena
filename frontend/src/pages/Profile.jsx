import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { LogOut, User, Mail, Shield, ShieldAlert, Award, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/users/me/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) fetchStats();
  }, [user, getToken]);

  if (!user) return null;

  const role = user.publicMetadata?.role || 'User';

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] relative group">
              <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <User className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-black text-white tracking-tight">{user.username || user.firstName}</h2>
              <p className="text-slate-400 text-sm flex items-center gap-2">
                <Mail className="w-3 h-3" /> {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
            
            {role === 'Admin' ? (
              <div className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-400 font-bold text-sm">Administrator</span>
              </div>
            ) : (
              <div className="px-4 py-1.5 bg-primary/10 border border-primary/30 rounded-xl flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-primary font-bold text-sm">Pro User</span>
              </div>
            )}
          </div>

          {/* Stats Section */}
          <div className="flex-1 w-full space-y-6">
            <h3 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">Platform Statistics</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center">
                <Award className="w-6 h-6 text-yellow-400 mb-2" />
                <span className="text-2xl font-black text-white">{stats?.level || 1}</span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Level</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center">
                <Star className="w-6 h-6 text-primary mb-2" />
                <span className="text-2xl font-black text-white">{stats?.xp?.toLocaleString() || 0}</span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Total XP</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-400 mb-2" />
                <span className="text-2xl font-black text-white">{stats?.totalSubmissions || 0}</span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Submissions</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-purple-400 mb-2" />
                <span className="text-2xl font-black text-white">{stats?.streak || 0}</span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Day Streak</span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-end gap-4">
              <Link to="/dashboard" className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl transition-all border border-white/10">
                Back to Dashboard
              </Link>
              <button 
                onClick={() => signOut(() => window.location.href = "/")}
                className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-bold rounded-xl transition-all flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
