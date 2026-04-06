import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, ChevronRight, Filter, ChevronDown, Tag, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];
const DIFF_COLOR = { Easy: 'text-green-400', Medium: 'text-yellow-400', Hard: 'text-red-400' };
const DIFF_BG = {
  Easy: 'bg-green-500/10 border-green-500/20',
  Medium: 'bg-yellow-500/10 border-yellow-500/20',
  Hard: 'bg-red-500/10 border-red-500/20',
};

export default function Problems() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTags, setShowTags] = useState(false);
  const [solvedIds, setSolvedIds] = useState(new Set());
  const tagsRef = useRef(null);
  
  // Close tags dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (tagsRef.current && !tagsRef.current.contains(event.target)) {
        setShowTags(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tagsRef]);

  // Fetch problems and stats concurrently
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [probRes, statsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/problems`),
          token ? axios.get(`${import.meta.env.VITE_API_URL}/api/v1/users/me/stats`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { solvedIds: [] } })) : Promise.resolve({ data: { solvedIds: [] } })
        ]);
        
        setProblems(probRes.data);
        if (statsRes.data.solvedIds) {
          setSolvedIds(new Set(statsRes.data.solvedIds));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const allTags = Array.from(new Set(problems.flatMap(p => p.tags || []))).sort();

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const filtered = problems.filter(p => {
    const matchesDiff = filter === 'All' || p.difficulty === filter;
    const searchLow = search.toLowerCase();
    const matchesSearch = p.title.toLowerCase().includes(searchLow) || 
                          (p.description && p.description.toLowerCase().includes(searchLow));
    const matchesTags = selectedTags.length === 0 || selectedTags.every(t => p.tags?.includes(t));
    return matchesDiff && matchesSearch && matchesTags;
  });

  const counts = { Easy: 0, Medium: 0, Hard: 0 };
  problems.forEach(p => { if (counts[p.difficulty] !== undefined) counts[p.difficulty]++; });


  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Problem Library</h1>
        </div>
        <p className="text-slate-500 text-sm ml-[52px]">Browse all algorithmic challenges — pick one and start solving.</p>
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3 mb-6">
        {(['Easy', 'Medium', 'Hard']).map(d => (
          <button key={d} onClick={() => setFilter(filter === d ? 'All' : d)}
            className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
              filter === d ? DIFF_BG[d] + ' ' + DIFF_COLOR[d] : 'bg-[#0a0a0a] border-white/5 text-slate-500 hover:border-white/10'
            }`}>
            <div className="text-2xl font-black">{counts[d]}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5">{d}</div>
          </button>
        ))}
      </motion.div>

      {/* Search + Filter bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or tag…"
            className="w-full bg-[#0a0a0a] border border-white/5 focus:border-primary/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap md:flex-nowrap">
          
          {/* Tags Dropdown Trigger */}
          <div className="relative" ref={tagsRef}>
            <button 
              onClick={() => setShowTags(!showTags)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                selectedTags.length > 0 ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-[#0a0a0a] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showTags ? 'rotate-180' : ''}`} />
            </button>

            {/* Tags Dropdown Panel */}
            <AnimatePresence>
              {showTags && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-[calc(100%+8px)] w-[320px] sm:w-[400px] max-h-[400px] overflow-y-auto bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50 p-4 custom-scrollbar"
                >
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter by Topic</span>
                    {selectedTags.length > 0 && (
                      <button onClick={() => setSelectedTags([])} className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium">Clear All</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                          selectedTags.includes(tag)
                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-white/10 mx-1 hidden md:block"></div>

          <Filter className="w-4 h-4 text-slate-600 shrink-0 hidden md:block" />
          {DIFFICULTIES.map(d => (
            <button key={d} onClick={() => setFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hidden md:block ${
                filter === d
                  ? d === 'All' ? 'bg-primary/20 border-primary text-primary' :
                    d === 'Easy' ? 'bg-green-500/20 border-green-500 text-green-400' :
                    d === 'Medium' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                    'bg-red-500/20 border-red-500 text-red-400'
                  : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20'
              }`}>
              {d}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">

        {/* Header row */}
        <div className="grid grid-cols-12 px-5 py-3 border-b border-white/5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <span className="col-span-1">#</span>
          <span className="col-span-4">Title</span>
          <span className="col-span-2">Difficulty</span>
          <span className="col-span-3">Tags</span>
          <span className="col-span-2 text-right pr-2">Acceptance</span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-600 text-sm">No problems match your search.</div>
        ) : (
          filtered.map((prob, i) => (
            <motion.div key={prob._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <Link to={`/arena/${prob.slug}`}
                className="grid grid-cols-12 px-5 py-4 border-b border-white/3 hover:bg-white/3 transition-colors items-center group cursor-pointer">
                <span className="col-span-1 text-slate-600 text-sm font-mono">{i + 1}</span>
                <span className="col-span-4 flex flex-col justify-center">
                  <span className="text-sm font-semibold text-white group-hover:text-primary transition-colors flex items-center gap-2">
                    {prob.title.replace(/^\d+\.\s*/, '')}
                    {solvedIds.has(prob._id) && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 fill-green-500/20" title="Solved" />
                    )}
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </span>
                </span>
                <span className={`col-span-2 text-xs font-bold px-2.5 py-0.5 rounded-full border w-fit ${DIFF_BG[prob.difficulty]} ${DIFF_COLOR[prob.difficulty]}`}>
                  {prob.difficulty}
                </span>
                <span className="col-span-3 flex gap-1.5 flex-wrap">
                  {prob.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded bg-white/5 text-slate-500 text-[10px] border border-white/5">{tag}</span>
                  ))}
                </span>
                <span className="col-span-2 text-right pr-2">
                  {prob.totalAttempts > 0 ? (
                    <span className={`text-xs font-bold ${
                      Math.round((prob.totalAccepted / prob.totalAttempts) * 100) >= 50
                        ? 'text-green-400'
                        : Math.round((prob.totalAccepted / prob.totalAttempts) * 100) >= 30
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}>
                      {Math.round((prob.totalAccepted / prob.totalAttempts) * 100)}%
                    </span>
                  ) : (
                    <span className="text-xs text-slate-700">—</span>
                  )}
                </span>
              </Link>
            </motion.div>
          ))
        )}
      </motion.div>

      <p className="text-xs text-slate-700 text-center mt-5">
        Showing {filtered.length} of {problems.length} problems
      </p>
    </div>
  );
}
