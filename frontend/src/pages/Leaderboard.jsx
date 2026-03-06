import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, Zap, ChevronRight, Crown, Medal } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const RANK_STYLES = {
  1: { icon: <Crown className="w-4 h-4 text-yellow-400" />, bg: 'bg-yellow-500/10 border-yellow-500/20', text: 'text-yellow-400' },
  2: { icon: <Medal className="w-4 h-4 text-slate-300" />, bg: 'bg-slate-400/10 border-slate-400/20', text: 'text-slate-300' },
  3: { icon: <Medal className="w-4 h-4 text-orange-400" />, bg: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-400' },
};

const LEVEL_NAMES = ['', 'Novice', 'Apprentice', 'Coder', 'Developer', 'Engineer', 'Architect', 'Expert', 'Master', 'Grandmaster', 'Legend'];

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const currentUser = (() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : null;
    } catch { return null; }
  })();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/v1/users/leaderboard');
        setLeaders(res.data);
        if (currentUser?.username) {
          const myEntry = res.data.find(u => u.username === currentUser.username);
          setMyRank(myEntry || null);
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const filtered = leaders.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Global Leaderboard</h1>
        </div>
        <p className="text-slate-500 text-sm ml-[52px]">Ranked by total XP earned. Keep solving to climb the ranks.</p>
      </motion.div>

      {/* My Rank Banner */}
      {myRank && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-black text-lg text-white">
              {myRank.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Your Rank</p>
              <p className="text-white font-bold">#{myRank.rank} &mdash; {myRank.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-xs text-slate-500">XP</p>
              <p className="text-primary font-bold">{myRank.xp.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Streak</p>
              <p className="text-orange-400 font-bold flex items-center gap-1">{myRank.streak} <Flame className="w-3 h-3" /></p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by username..."
          className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_auto_auto_auto] items-center px-4 py-3 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span>#</span>
          <span>User</span>
          <span className="text-right w-20">Level</span>
          <span className="text-right w-24">Streak</span>
          <span className="text-right w-24">XP</span>
        </div>

        {filtered.map((user, i) => {
          const isMe = user.username === currentUser?.username;
          const rankStyle = RANK_STYLES[user.rank];
          return (
            <motion.div
              key={user.username}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`grid grid-cols-[48px_1fr_auto_auto_auto] items-center px-4 py-3.5 border-b border-white/5 last:border-0 transition-colors hover:bg-white/3 ${isMe ? 'bg-primary/5' : ''}`}
            >
              {/* Rank */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${rankStyle ? rankStyle.bg + ' ' + rankStyle.text : 'bg-white/5 text-slate-400'} border`}>
                {rankStyle ? rankStyle.icon : <span className="text-xs">{user.rank}</span>}
              </div>

              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/50 to-accent/50 flex items-center justify-center font-bold text-sm text-white shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className={`font-semibold text-sm ${isMe ? 'text-primary' : 'text-white'}`}>
                    {user.username} {isMe && <span className="text-[10px] text-primary/80 ml-1">(you)</span>}
                  </p>
                  <p className="text-xs text-slate-500">{LEVEL_NAMES[Math.min(user.level, 10)] || 'Legend'}</p>
                </div>
              </div>

              {/* Level */}
              <div className="text-right w-20">
                <span className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded-md text-slate-300">Lv {user.level}</span>
              </div>

              {/* Streak */}
              <div className="text-right w-24">
                {user.streak > 0 ? (
                  <span className="text-orange-400 font-bold flex items-center justify-end gap-1 text-sm">
                    {user.streak} <Flame className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="text-slate-600 text-sm">—</span>
                )}
              </div>

              {/* XP */}
              <div className="text-right w-24">
                <span className="text-primary font-bold text-sm flex items-center justify-end gap-1">
                  <Zap className="w-3 h-3" /> {user.xp.toLocaleString()}
                </span>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">No users found matching &quot;{search}&quot;</div>
        )}
      </div>
    </div>
  );
}
