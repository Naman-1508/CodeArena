import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, CheckCircle, Clock, Search, ShieldAlert, Cpu } from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('proposals'); // 'proposals' | 'users'
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/login');

        // Check if actually admin implicitly by whether calls succeed
        const [usersRes, proposalsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/v1/users/admin/all-users', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5000/api/v1/problems/admin/proposals', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setUsers(usersRes.data);
        setProposals(proposalsRes.data);
      } catch (err) {
        console.error('Admin access denied:', err);
        navigate('/dashboard'); // not admin or error
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, [navigate]);

  const approveProposal = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/v1/problems/admin/proposals/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter it out or change status
      setProposals(p => p.map(prop => prop._id === id ? { ...prop, status: 'Approved' } : prop));
    } catch (err) {
      console.error(err);
      alert('Failed to approve');
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 relative overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0a] p-8 shadow-2xl flex items-center justify-between">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/15 via-purple-900/15 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <ShieldAlert className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Admin Headquarters</h1>
            <p className="text-slate-400 text-sm mt-1">Manage platform content and observe user analytics.</p>
          </div>
        </div>

        <div className="relative z-10 flex gap-4">
          <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-xl px-5 py-3 min-w-[120px]">
            <span className="text-indigo-400 font-black text-2xl">{users.length}</span>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Users</span>
          </div>
          <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-xl px-5 py-3 min-w-[120px]">
            <span className="text-pink-400 font-black text-2xl">{proposals.filter(p => p.status === 'Pending').length}</span>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pending Proposals</span>
          </div>
        </div>
      </motion.header>

      {/* ── TABS ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 bg-[#0a0a0a] p-1.5 rounded-xl border border-white/10 w-fit">
        <button onClick={() => setActiveTab('proposals')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'proposals' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          <Clock className="w-4 h-4" /> Problem Proposals
        </button>
        <button onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          <Users className="w-4 h-4" /> Registered Users
        </button>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────── */}
      {activeTab === 'proposals' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {proposals.length === 0 ? (
            <div className="text-center p-12 bg-[#0a0a0a] border border-white/5 rounded-2xl">
              <p className="text-slate-500">No proposals found.</p>
            </div>
          ) : (
            proposals.map(prop => (
              <div key={prop._id} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start transition-all hover:border-indigo-500/30">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{prop.title}</h3>
                    <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded border ${
                      prop.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      prop.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>{prop.difficulty}</span>
                    <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded border ${
                      prop.status === 'Approved' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    }`}>{prop.status}</span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2 mb-3 leading-relaxed">{prop.description}</p>
                  <div className="flex gap-2">
                    {prop.tags?.map(tag => (
                      <span key={tag} className="text-[10px] text-slate-500 bg-white/5 px-2 py-1 rounded-md">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                  {prop.status === 'Pending' ? (
                    <button onClick={() => approveProposal(prop._id)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Approve &amp; Publish
                    </button>
                  ) : (
                    <button disabled className="px-5 py-2.5 bg-white/5 text-slate-500 text-sm font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" /> Published
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 border-b border-white/5 text-slate-400 uppercase text-[10px] tracking-wider font-black">
                <tr>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Level (XP)</th>
                  <th className="px-6 py-4">Joined At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex justify-center items-center text-xs">
                        {u.username.charAt(0)}
                      </div>
                      {u.username}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider border ${
                        u.role === 'Admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">Level {u.level} ({u.xp} XP)</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

    </div>
  );
}
