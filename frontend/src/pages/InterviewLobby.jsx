import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Link as LinkIcon, Plus, ArrowRight, ShieldCheck, Video, Code2 } from 'lucide-react';
import axios from 'axios';

export default function InterviewLobby() {
  const navigate = useNavigate();
  const [joinToken, setJoinToken] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateRoom = async () => {
    setError(null);
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('You must be logged in to create a room.');

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/interviews/create`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { roomToken } = response.data;
      navigate(`/interview/${roomToken}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create room.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinToken.trim()) return;
    
    setError(null);
    setJoining(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('You must be logged in to join a room.');

      // Extract token in case they pasted the full URL
      let finalToken = joinToken.trim();
      try {
        const parsedUrl = new URL(finalToken);
        const parts = parsedUrl.pathname.split('/');
        finalToken = parts[parts.length - 1]; // get the last path segment
      } catch (e) {
        // Not a valid URL, treat it as a raw token
      }

      navigate(`/interview/${finalToken}`);
    } catch (err) {
      setError(err.message || 'Failed to join room.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
      
      {/* Hero Section */}
      <div className="text-center mb-12 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-6">
          <Users className="w-4 h-4" />
          <span>Peer-to-Peer Pair Programming</span>
        </motion.div>
        
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Collaborative <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Interview Rooms</span>
        </motion.h1>
        
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-slate-400 text-lg">
          Create an isolated session to code alongside friends, practice real-time technical interviews, or collaborate on complex algorithms.
        </motion.p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-medium flex items-center gap-2">
          {error}
        </motion.div>
      )}

      {/* Action Cards */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl">
        
        {/* Create Room Card */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex-1 group relative rounded-3xl bg-surface/30 border border-white/5 p-8 flex flex-col items-center text-center overflow-hidden hover:bg-surface/50 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
            <Plus className="w-8 h-8 text-blue-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">New Session</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Generate a unique room link. You will be the host and can share the URL with a peer to join your live coding environment.
          </p>

          <button
            onClick={handleCreateRoom}
            disabled={creating}
            className="w-full relative flex items-center justify-center gap-2 py-3.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-[1.02]"
          >
            {creating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-5 h-5" />}
            {creating ? 'Generating Room...' : 'Create Room'}
          </button>
        </motion.div>

        {/* Join Room Card */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex-1 group relative rounded-3xl bg-surface/30 border border-white/5 p-8 flex flex-col items-center text-center overflow-hidden hover:bg-surface/50 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <LinkIcon className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Join Existing</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Enter an existing room token provided by a friend or interviewer to enter their private collaborative session instantly.
          </p>

          <form onSubmit={handleJoinRoom} className="w-full flex flex-col gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Paste Room ID (e.g. aba83-128a-4...)"
                value={joinToken}
                onChange={(e) => setJoinToken(e.target.value)}
                className="w-full pl-4 pr-10 py-3.5 bg-[#111] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
              />
            </div>
            <button
              type="submit"
              disabled={joining || !joinToken.trim()}
              className="w-full relative flex items-center justify-center gap-2 py-3.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Join Session'}
              {!joining && <ArrowRight className="w-4 h-4 ml-1 opacity-60" />}
            </button>
          </form>
        </motion.div>

      </div>

      {/* Features showcase */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-16 flex gap-8 justify-center flex-wrap opacity-60">
        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
          <ShieldCheck className="w-4 h-4 text-green-400" /> Isolated Environments
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
          <Code2 className="w-4 h-4 text-blue-400" /> Live WebSocket Sync
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
          <Video className="w-4 h-4 text-purple-400" /> Integrated Reporting
        </div>
      </motion.div>

    </div>
  );
}
