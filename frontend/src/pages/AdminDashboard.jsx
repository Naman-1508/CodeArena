import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, CheckCircle, ShieldAlert, Flame, Zap } from 'lucide-react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export default function AdminDashboard() {
  const { tab } = useParams();
  const activeTab = tab || 'analytics';
  const [users, setUsers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [problems, setProblems] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);

  const navigate = useNavigate();
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = await getToken();
        if (!token) return navigate('/login');

        // Check if actually admin implicitly by whether calls succeed
        const [usersRes, proposalsRes, problemsRes, statsRes, interviewsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/users/admin/all-users`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/problems/admin/proposals`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/problems`).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/users/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null })),
          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/interviews/admin/all`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ]);

        setUsers(usersRes.data);
        setProposals(proposalsRes.data);
        setProblems(problemsRes.data);
        setStats(statsRes.data);
        setInterviews(interviewsRes.data);
      } catch (err) {
        console.error('Admin access denied or data fetch failed:', err);
        // We stay on the page and just show the error or empty states instead of redirecting
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, [navigate]);

  const approveProposal = async (id) => {
    try {
      const token = await getToken();
      await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/problems/admin/proposals/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProposals(p => p.map(prop => prop._id === id ? { ...prop, status: 'Approved' } : prop));
    } catch (err) {
      console.error(err);
      alert('Failed to approve');
    }
  };

  const rejectProposal = (id) => {
    setProposals(p => p.map(prop => prop._id === id ? { ...prop, status: 'Rejected' } : prop));
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

        <div className="relative z-10 flex gap-4 flex-wrap">
          <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-xl px-5 py-3 min-w-[110px]">
            <span className="text-indigo-400 font-black text-2xl">{users.length}</span>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Users</span>
          </div>
          <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-xl px-5 py-3 min-w-[110px]">
            <span className="text-pink-400 font-black text-2xl">{proposals.filter(p => p.status === 'Pending').length}</span>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pending Proposals</span>
          </div>
          <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-xl px-5 py-3 min-w-[110px]">
            <span className="text-emerald-400 font-black text-2xl">{problems.length}</span>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Problems</span>
          </div>
          <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-xl px-5 py-3 min-w-[110px]">
            <span className="text-amber-400 font-black text-2xl">{stats?.totalSubmissions ?? '—'}</span>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Submissions</span>
          </div>
          {stats?.newUsersThisWeek !== undefined && (
            <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-xl px-5 py-3 min-w-[110px]">
              <span className="text-cyan-400 font-black text-2xl">+{stats.newUsersThisWeek}</span>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">New This Week</span>
            </div>
          )}
        </div>
      </motion.header>

      {/* ── CONTENT ─────────────────────────────────────────────── */}
      {activeTab === 'analytics' && stats && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[50px] rounded-full pointer-events-none" />
               <h3 className="text-xl font-bold text-white mb-4">Acceptance Rate Over Time</h3>
               <div className="flex flex-col gap-2">
                 <div className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-xl border border-white/10">
                   <span className="text-slate-400 font-bold">Total Platform Submissions</span>
                   <span className="text-white font-black text-xl">{stats.totalSubmissions}</span>
                 </div>
                 <div className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-xl border border-white/10">
                   <span className="text-slate-400 font-bold">Total Platform Completions</span>
                   <span className="text-white font-black text-xl text-emerald-400">{stats.passedSubmissions}</span>
                 </div>
                 <div className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-xl border border-white/10 mt-2">
                   <span className="text-slate-400 font-bold">Average Acceptance Rate</span>
                   <span className="text-white font-black text-2xl">{stats.acceptanceRate}%</span>
                 </div>
               </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />
               <h3 className="text-xl font-bold text-white mb-4">Most Attempted Problems</h3>
               <div className="space-y-3">
                 {stats.topProblems?.map((p, idx) => (
                   <div key={p.slug} className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5 hover:bg-white/5 transition-colors">
                     <div className="flex items-center gap-3">
                       <span className="text-indigo-400 font-black text-lg w-6">{idx + 1}.</span>
                       <div>
                         <p className="text-white font-bold text-sm">{p.title}</p>
                         <p className="text-xs text-slate-500">{p.difficulty}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-amber-400 font-bold text-sm">{p.totalAttempts} att.</p>
                       <p className="text-xs text-slate-500">{p.totalAccepted} acc.</p>
                     </div>
                   </div>
                 ))}
                 {(!stats.topProblems || stats.topProblems.length === 0) && (
                   <p className="text-slate-500 text-sm">No problem data yet.</p>
                 )}
               </div>
            </div>
          </div>
          
          <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Recent Submissions Engine</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-black/40 border-b border-white/5 text-slate-400 uppercase text-[10px] tracking-wider font-black">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Problem</th>
                    <th className="px-4 py-3">Language</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tests Passed</th>
                    <th className="px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.recentSubmissions?.map(sub => (
                    <tr key={sub._id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-slate-300 font-bold">{sub.userId?.username || 'Unknown'}</td>
                      <td className="px-4 py-3 text-indigo-400 hover:underline"><Link to={`/problems/${sub.problemId?.slug}`}>{sub.problemId?.title || 'Unknown'}</Link></td>
                      <td className="px-4 py-3 text-slate-400">{sub.language}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          sub.status === 'Pass' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          sub.status === 'Fail' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          sub.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>{sub.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{sub.passedCount} / {sub.totalCount}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(sub.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!stats.recentSubmissions || stats.recentSubmissions.length === 0) && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-500">No submissions recently recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
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
                    <>
                      <button onClick={() => approveProposal(prop._id)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Approve &amp; Publish
                      </button>
                      <button onClick={() => rejectProposal(prop._id)}
                        className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                        Reject
                      </button>
                    </>
                  ) : (
                    <button disabled className={`px-5 py-2.5 text-sm font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2 ${
                      prop.status === 'Approved' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      <Shield className="w-4 h-4" /> {prop.status}
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
                  <th className="px-6 py-4 text-center">Submissions</th>
                  <th className="px-6 py-4 text-center">Accepted</th>
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
                    <td className="px-6 py-4 text-center text-slate-400">{u.totalSubmissions || 0}</td>
                    <td className="px-6 py-4 text-center text-emerald-400 font-bold">{u.passedSubmissions || 0}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === 'interviews' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden mt-6">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 border-b border-white/5 text-slate-400 uppercase text-[10px] tracking-wider font-black">
                <tr>
                  <th className="px-6 py-4">Room Token</th>
                  <th className="px-6 py-4">Interviewer</th>
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {interviews.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-6 text-center text-slate-500">No interviews tracked.</td></tr>
                ) : interviews.map(i => (
                  <tr key={i._id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-indigo-400 text-xs">{i.roomToken.split('-')[0]}***</td>
                    <td className="px-6 py-4 font-bold text-slate-300">{i.interviewerId?.username || 'Unknown'}</td>
                    <td className="px-6 py-4 text-slate-400">{i.candidateId?.username || 'Not Joined'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider border ${
                        i.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        i.status === 'Completed' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>{i.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{i.startedAt ? new Date(i.startedAt).toLocaleString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === 'ai-generator' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8 mt-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">AI Platform Assistant</h2>
                <p className="text-slate-400 text-sm">Analyze stats, request insights, and get administrative recommendations.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Ask the AI Assistant</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Based on the stats, which problems should we add next? Or summarize our user growth."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all min-h-[120px] resize-y"
                />
              </div>

              <button
                onClick={async () => {
                  if (!aiPrompt.trim()) return;
                  setGeneratingAi(true);
                  try {
                    const token = await getToken();
                    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/problems/admin/generate-ai`, 
                      { prompt: aiPrompt, stats },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setAiPrompt(res.data.response); // Put response in the text area so they can read it
                  } catch (err) {
                    console.error(err);
                    alert('Failed to get AI response');
                  } finally {
                    setGeneratingAi(false);
                  }
                }}
                disabled={generatingAi || !aiPrompt.trim()}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  generatingAi || !aiPrompt.trim() 
                  ? 'bg-white/5 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]'
                }`}
              >
                {generatingAi ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing Data...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" /> Generate Insights
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
