import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Target, Zap, BookOpen, ArrowRight, X, Send, ChevronRight, Lock, CheckCircle, Clock, Code2, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import SubmissionHeatmap from '../components/SubmissionHeatmap';

export default function Dashboard() {
  const [userStats, setUserStats] = useState({
    username: 'Developer',
    xp: 0,
    level: 1,
    nextLevelXp: 1000,
    streak: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    heatmap: []
  });
  
  const [statsLoading, setStatsLoading] = useState(true);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setStatsLoading(false);
          return;
        }
        const [statsRes, dailyRes, submissionsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/v1/users/me/stats', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5000/api/v1/daily').catch(() => ({ data: null })),
          axios.get('http://localhost:5000/api/v1/users/me/submissions?limit=5', {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: { submissions: [] } }))
        ]);
        
        const nextXp = statsRes.data.level * 1000;
        
        setUserStats({
          username: statsRes.data.username || 'Developer',
          xp: statsRes.data.xp || 0,
          level: statsRes.data.level || 1,
          nextLevelXp: nextXp,
          streak: statsRes.data.streak || 0,
          easySolved: statsRes.data.easySolved || 0,
          mediumSolved: statsRes.data.mediumSolved || 0,
          hardSolved: statsRes.data.hardSolved || 0,
          heatmap: statsRes.data.heatmap || []
        });

        if (dailyRes.data?.problem) setDailyChallenge(dailyRes.data);
        if (submissionsRes.data?.submissions) setRecentSubmissions(submissionsRes.data.submissions);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const progress = (userStats.xp / userStats.nextLevelXp) * 100;



  // ── Propose-a-Problem Modal ────────────────────────────────────────
  const [showPropose, setShowPropose] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [proposeSuccess, setProposeSuccess] = useState(false);
  const [proposeForm, setProposeForm] = useState({
    title: '', difficulty: 'Easy', description: '', tags: '', exampleInput: '', exampleOutput: ''
  });
  const [proposeError, setProposeError] = useState('');

  const handlePropose = async (e) => {
    e.preventDefault();
    setProposeError('');
    setProposing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/v1/problems/propose', {
        ...proposeForm,
        tags: proposeForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setProposeSuccess(true);
    } catch (err) {
      setProposeError(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setProposing(false);
    }
  };

  const closeModal = () => {
    setShowPropose(false);
    setProposeSuccess(false);
    setProposeError('');
    setProposeForm({ title: '', difficulty: 'Easy', description: '', tags: '', exampleInput: '', exampleOutput: '' });
  };

  const diffColor = { Easy: 'text-green-400', Medium: 'text-yellow-400', Hard: 'text-red-400' };
  const diffBg = { Easy: 'bg-green-500/10 border-green-500/20', Medium: 'bg-yellow-500/10 border-yellow-500/20', Hard: 'bg-red-500/10 border-red-500/20' };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">

      {/* ── HERO BANNER ─────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 relative overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0a] p-7 shadow-2xl shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/15 via-purple-900/15 to-transparent" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/8 blur-[90px] rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent p-[2px] shadow-[0_0_25px_rgba(59,130,246,0.25)]">
                <div className="w-full h-full bg-[#0a0a0a] rounded-xl flex items-center justify-center font-black text-3xl text-white">
                  {userStats.username.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-accent text-black text-xs flex items-center justify-center font-black border-2 border-[#0a0a0a]">
                {userStats.level}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">{userStats.username}</h1>
              <span className="px-3 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold tracking-widest uppercase">Gold Tier</span>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            {[
              { icon: <Flame className="w-5 h-5 fill-orange-500 text-orange-500" />, value: userStats.streak, label: 'Day Streak', color: 'text-orange-500' },
              { icon: <Zap className="w-5 h-5 fill-accent text-accent" />, value: `Lvl ${userStats.level}`, label: 'Current Tier', color: 'text-accent' },
              { icon: <CheckCircle className="w-5 h-5 text-green-400" />, value: userStats.easySolved + userStats.mediumSolved + userStats.hardSolved, label: 'Total Solved', color: 'text-green-400' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center p-4 bg-black/50 border border-white/5 rounded-2xl min-w-[100px]">
                <div className={`flex items-center gap-1.5 font-black text-xl mb-0.5 ${s.color}`}>
                  {s.icon}
                  {statsLoading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin ml-1" /> : s.value}
                </div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.header>

      {/* ── STATS ROW ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* XP Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="col-span-1 lg:col-span-2 bg-[#0a0a0a] border border-white/5 p-7 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-56 h-56 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20"><Trophy className="w-5 h-5 text-primary" /></div>
              <h2 className="text-lg font-bold">Season Progression</h2>
            </div>
            <span className="text-2xl font-black text-white">
              {statsLoading ? '...' : userStats.xp} <span className="text-primary text-base">XP</span>
            </span>
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
            <span>Level {userStats.level}</span><span>Level {userStats.level + 1}</span>
          </div>
          <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-white/5">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, progress)}%` }} transition={{ duration: 1.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-blue-500 via-primary to-accent rounded-full shadow-[0_0_10px_rgba(34,211,238,0.4)]" />
          </div>
          <p className="text-sm text-slate-500 mt-4 text-center">
            Earn <strong className="text-white">{Math.max(0, userStats.nextLevelXp - userStats.xp)} XP</strong> to unlock next rank badge
          </p>
        </motion.div>

        {/* Solved Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-[#0a0a0a] border border-white/5 p-7 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-xl"><Target className="w-5 h-5 text-accent" /></div>
            <h2 className="text-lg font-bold">Algorithms Solved</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Easy', count: userStats.easySolved, max: 50, color: 'bg-green-500', text: 'text-green-400' },
              { label: 'Medium', count: userStats.mediumSolved, max: 50, color: 'bg-yellow-500', text: 'text-yellow-400' },
              { label: 'Hard', count: userStats.hardSolved, max: 50, color: 'bg-red-500', text: 'text-red-400' },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className={s.text}>{s.label}</span>
                  <span className="text-white">{s.count}</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full border border-white/5">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (s.count / s.max) * 100)}%` }} transition={{ duration: 1.5, delay: 0.5 }}
                    className={`h-full ${s.color} rounded-full`} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── ACTIVITY HEATMAP ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-8">
        <SubmissionHeatmap heatmapData={userStats.heatmap} isLoading={statsLoading} />
      </motion.div>

      {/* ── DAILY CHALLENGE ─────────────────────────────────────────── */}
      {dailyChallenge?.problem && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="mb-6 bg-gradient-to-r from-primary/10 via-blue-900/10 to-transparent border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">Daily Challenge</span>
                <span className="text-[10px] text-slate-500">{dailyChallenge.date}</span>
              </div>
              <h3 className="text-white font-bold text-base">{dailyChallenge.problem.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  dailyChallenge.problem.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  dailyChallenge.problem.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>{dailyChallenge.problem.difficulty}</span>
                {dailyChallenge.problem.tags?.slice(0, 2).map(tag => (
                  <span key={tag} className="text-[10px] text-slate-500">{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <Link to={`/arena/${dailyChallenge.problem.slug}`}
            className="px-5 py-2.5 bg-primary hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all whitespace-nowrap shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center gap-2">
            Solve Today's Problem <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}

      {/* ── RECENT SUBMISSIONS ───────────────────────────────────────── */}
      {recentSubmissions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="mb-8 bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-sm text-white">Recent Submissions</h3>
            </div>
            <Link to="/problems" className="text-xs text-primary hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentSubmissions.map((sub, i) => (
              <Link key={sub._id} to={`/arena/${sub.problemId?.slug}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/3 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    sub.status === 'Pass' ? 'bg-green-500' :
                    sub.status === 'Fail' ? 'bg-red-500' :
                    sub.status === 'Error' ? 'bg-orange-500' : 'bg-slate-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                      {sub.problemId?.title || 'Unknown Problem'}
                    </p>
                    <p className="text-xs text-slate-500">{sub.language}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span className={`text-xs font-bold ${
                    sub.status === 'Pass' ? 'text-green-400' :
                    sub.status === 'Fail' ? 'text-red-400' :
                    'text-orange-400'
                  }`}>{sub.status}</span>
                  <span className="text-xs text-slate-600">{new Date(sub.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
      {/* ── QUICK ACTIONS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/problems" className="block group">
          <motion.div whileHover={{ y: -3 }} className="bg-[#0a0a0a] border border-white/5 hover:border-primary/40 p-5 rounded-2xl relative overflow-hidden transition-colors h-full flex flex-col justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary"><Target className="w-5 h-5 flex-shrink-0" /></div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors">Practice Arena</h3>
                <p className="text-xs text-slate-500">Solve algorithms &amp; earn XP</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-primary transition-colors" />
          </motion.div>
        </Link>
        
        <Link to="/mock-interview" className="block group">
          <motion.div whileHover={{ y: -3 }} className="bg-[#0a0a0a] border border-white/5 hover:border-orange-500/40 p-5 rounded-2xl relative overflow-hidden transition-colors h-full flex flex-col justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400"><Clock className="w-5 h-5 flex-shrink-0" /></div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">Mock Interview</h3>
                <p className="text-xs text-slate-500">Timed solo practice session</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-orange-400 transition-colors" />
          </motion.div>
        </Link>

        <Link to="/interview/demo-room" className="block group">
          <motion.div whileHover={{ y: -3 }} className="bg-[#0a0a0a] border border-white/5 hover:border-accent/40 p-5 rounded-2xl relative overflow-hidden transition-colors h-full flex flex-col justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-xl text-accent"><Flame className="w-5 h-5 flex-shrink-0" /></div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-accent transition-colors">Live Interview</h3>
                <p className="text-xs text-slate-500">Collaborative real-time room</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-accent transition-colors" />
          </motion.div>
        </Link>

        {/* Submit Problem Card */}
        <motion.div whileHover={{ y: -3 }} onClick={() => setShowPropose(true)}
          className="bg-[#0a0a0a] border border-white/5 hover:border-violet-500/40 p-5 rounded-2xl relative overflow-hidden transition-colors cursor-pointer group h-full flex flex-col justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400"><Send className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors">Submit a Problem</h3>
              <p className="text-xs text-slate-500">Propose &amp; get published on CodeArena</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-violet-400 transition-colors" />
        </motion.div>
      </div>

      {/* ── PROPOSE-A-PROBLEM MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {showPropose && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}>

            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                    <Send className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base">Submit a Problem</h2>
                    <p className="text-xs text-slate-500">We review all submissions and publish the best ones</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {proposeSuccess ? (
                <div className="py-16 px-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mb-5">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Problem Submitted!</h3>
                  <p className="text-slate-400 text-sm max-w-sm">Our team will review your submission and reach out if it gets published on CodeArena. Thank you for contributing!</p>
                  <button onClick={closeModal} className="mt-8 px-6 py-2.5 bg-primary hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all">
                    Back to Dashboard
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePropose} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {proposeError && (
                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{proposeError}</div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Title */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Problem Title</label>
                      <input
                        required value={proposeForm.title}
                        onChange={e => setProposeForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Longest Palindromic Substring"
                        className="w-full bg-black/40 border border-white/10 focus:border-primary/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                      />
                    </div>
                    {/* Difficulty */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Difficulty</label>
                      <select value={proposeForm.difficulty}
                        onChange={e => setProposeForm(p => ({ ...p, difficulty: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 focus:border-primary/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors">
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Problem Description</label>
                    <textarea
                      required rows={5} value={proposeForm.description}
                      onChange={e => setProposeForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Describe the problem clearly. Include constraints, input/output format, and edge cases..."
                      className="w-full bg-black/40 border border-white/10 focus:border-primary/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors resize-none"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Tags <span className="text-slate-600 normal-case font-normal">(comma-separated)</span></label>
                    <input
                      value={proposeForm.tags}
                      onChange={e => setProposeForm(p => ({ ...p, tags: e.target.value }))}
                      placeholder="e.g. Array, Dynamic Programming, String"
                      className="w-full bg-black/40 border border-white/10 focus:border-primary/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  {/* Example I/O */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Example Input</label>
                      <textarea
                        rows={3} value={proposeForm.exampleInput}
                        onChange={e => setProposeForm(p => ({ ...p, exampleInput: e.target.value }))}
                        placeholder='e.g.\nnums = [2,7,11,15]\ntarget = 9'
                        className="w-full bg-black/40 border border-white/10 focus:border-primary/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none font-mono resize-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Example Output</label>
                      <textarea
                        rows={3} value={proposeForm.exampleOutput}
                        onChange={e => setProposeForm(p => ({ ...p, exampleOutput: e.target.value }))}
                        placeholder='e.g.\n[0, 1]'
                        className="w-full bg-black/40 border border-white/10 focus:border-primary/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none font-mono resize-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button type="button" onClick={closeModal}
                      className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 text-sm font-semibold transition-all">
                      Cancel
                    </button>
                    <button type="submit" disabled={proposing}
                      className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50">
                      {proposing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                      {proposing ? 'Submitting…' : 'Submit for Review'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}