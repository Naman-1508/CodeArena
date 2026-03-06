import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Play, Clock, CheckCircle, XCircle, ChevronDown, RotateCcw, AlertTriangle, Target } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const DURATIONS = [
  { label: '15 min', value: 15 * 60 },
  { label: '30 min', value: 30 * 60 },
  { label: '45 min', value: 45 * 60 },
  { label: '60 min', value: 60 * 60 },
];

const DIFF_COLOR = { Easy: 'text-green-400', Medium: 'text-yellow-400', Hard: 'text-red-400' };
const DIFF_BG = { Easy: 'bg-green-500/10 border-green-500/20', Medium: 'bg-yellow-500/10 border-yellow-500/20', Hard: 'bg-red-500/10 border-red-500/20' };

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function MockInterview() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('setup'); // setup | active | finished
  const [difficulty, setDifficulty] = useState('Medium');
  const [duration, setDuration] = useState(45 * 60);
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('node');
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const intervalRef = useRef(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { status, passedCount, totalCount, runtimeMs, testResults }
  const [startTime, setStartTime] = useState(null);
  const [timeTaken, setTimeTaken] = useState(0);

  const STARTER = {
    node: `// Write your solution\nfunction solution() {\n    // your code here\n}`,
    python: `# Write your solution\ndef solution():\n    pass`,
    java: `class Solution {\n    public void solution() {\n        // your code here\n    }\n}`,
    cpp: `class Solution {\npublic:\n    void solution() {\n        // your code here\n    }\n};`,
  };

  // Tick the timer
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setTimerActive(false);
            handleTimeUp();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerActive]);

  const handleTimeUp = () => {
    setPhase('finished');
    setTimeTaken(duration);
  };

  const startInterview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/random?difficulty=${difficulty}`);
      const p = res.data;
      setProblem(p);
      
      // Fetch full problem for description + initial code
      const fullRes = await axios.get(`http://localhost:5000/api/v1/problems/${p.slug}`);
      const full = fullRes.data;
      let initCode = full.initialCode || STARTER[language];
      if (typeof initCode === 'string') {
        initCode = initCode.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      }
      setCode(initCode);
      setProblem(full);
      setTimeLeft(duration);
      setStartTime(Date.now());
      setTimerActive(true);
      setPhase('active');
    } catch (err) {
      setError('Failed to load a problem. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pollResult = async (submissionId, started) => {
    const token = localStorage.getItem('token');
    let attempts = 0;
    while (attempts < 30) {
      try {
        const res = await axios.get(`http://localhost:5000/api/v1/submissions/${submissionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const sub = res.data;
        if (sub.status !== 'Pending') {
          const elapsed = Math.round((Date.now() - started) / 1000);
          setTimeTaken(duration - timeLeft);
          setResult({
            status: sub.status,
            passedCount: sub.passedCount,
            totalCount: sub.totalCount,
            runtimeMs: sub.runtimeMs,
            testResults: sub.testResults || [],
          });
          clearInterval(intervalRef.current);
          setTimerActive(false);
          setPhase('finished');
          return;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 1200));
      attempts++;
    }
    setResult({ status: 'Error', passedCount: 0, totalCount: 0, runtimeMs: 0, testResults: [] });
    setPhase('finished');
  };

  const handleSubmit = async () => {
    if (!problem) return;
    setSubmitting(true);
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const started = Date.now();
      const res = await axios.post(`http://localhost:5000/api/v1/problems/${problem._id}/submit`,
        { code, language }, { headers: { Authorization: `Bearer ${token}` } }
      );
      await pollResult(res.data.submissionId, started);
    } catch (err) {
      setResult({ status: 'Error', passedCount: 0, totalCount: 0, runtimeMs: 0, testResults: [] });
      setPhase('finished');
    } finally {
      setSubmitting(false);
    }
  };

  const timePct = duration > 0 ? (timeLeft / duration) * 100 : 0;
  const timeColor = timePct > 40 ? 'text-green-400' : timePct > 15 ? 'text-yellow-400' : 'text-red-400';
  const timerBarColor = timePct > 40 ? 'bg-green-500' : timePct > 15 ? 'bg-yellow-500' : 'bg-red-500';

  // ── SETUP SCREEN ─────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Mock Interview</h1>
              <p className="text-sm text-slate-500">Simulated technical interview under time pressure</p>
            </div>
          </div>

          {/* Difficulty */}
          <div className="mb-5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {['Easy', 'Medium', 'Hard'].map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${difficulty === d ? DIFF_BG[d] + ' ' + DIFF_COLOR[d] : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="mb-7">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Time Limit</label>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map(d => (
                <button key={d.value} onClick={() => setDuration(d.value)}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${duration === d.value ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mb-7 text-sm text-yellow-400">
            <AlertTriangle className="w-4 h-4 inline mr-2 mb-0.5" />
            You'll get <strong>one random {difficulty} problem</strong>. The timer starts immediately. No pausing.
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <button onClick={startInterview} disabled={loading}
            className="w-full py-3.5 bg-primary hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Play className="w-4 h-4 fill-white" />}
            {loading ? 'Loading Problem...' : 'Start Mock Interview'}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── FINISHED SCREEN ─────────────────────────────────────
  if (phase === 'finished') {
    const passed = result?.status === 'Pass';
    const scorePercent = result?.totalCount > 0
      ? Math.round((result.passedCount / result.totalCount) * 100)
      : 0;
    const minutesTaken = Math.floor(timeTaken / 60);
    const secsTaken = timeTaken % 60;

    return (
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
          
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${passed ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
            {passed ? <CheckCircle className="w-10 h-10 text-green-400" /> : <XCircle className="w-10 h-10 text-red-400" />}
          </div>
          
          <h2 className="text-2xl font-black text-white mb-1">{passed ? 'Interview Passed!' : 'Keep Practicing'}</h2>
          <p className="text-slate-400 text-sm mb-6">{problem?.title}</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-black/40 rounded-xl p-3 border border-white/5">
              <div className={`text-2xl font-black ${passed ? 'text-green-400' : 'text-red-400'}`}>{scorePercent}%</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Test Score</div>
            </div>
            <div className="bg-black/40 rounded-xl p-3 border border-white/5">
              <div className="text-2xl font-black text-white">{minutesTaken}:{secsTaken.toString().padStart(2,'0')}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Time Used</div>
            </div>
            <div className="bg-black/40 rounded-xl p-3 border border-white/5">
              <div className="text-2xl font-black text-white">{result?.runtimeMs || 0}ms</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Runtime</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setPhase('setup'); setResult(null); setProblem(null); }}
              className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-sm font-semibold transition-all flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
            {problem && (
              <Link to={`/arena/${problem.slug}`}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-blue-500 text-white text-sm font-bold transition-all flex items-center justify-center">
                Review in Arena
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── ACTIVE INTERVIEW ─────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-[#060606] h-screen overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${problem ? DIFF_BG[problem.difficulty] + ' ' + DIFF_COLOR[problem.difficulty] : ''}`}>
            {problem?.difficulty}
          </span>
          <span className="text-white font-semibold text-sm truncate max-w-xs">{problem?.title}</span>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <div className={`font-black text-xl tabular-nums ${timeColor}`}>
              <Clock className="w-4 h-4 inline mr-1 mb-0.5" />{formatTime(timeLeft)}
            </div>
            <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
              <div className={`h-full ${timerBarColor} rounded-full transition-all`} style={{ width: `${timePct}%` }} />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-lg font-bold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] disabled:opacity-50">
            {submitting
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Play className="w-3.5 h-3.5 fill-white" />}
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* Main 2-panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Problem Description */}
        <div className="w-[42%] border-r border-white/5 overflow-y-auto p-6 bg-[#050505]">
          {problem && (
            <div
              className="prose prose-invert prose-slate text-sm max-w-none prose-p:leading-relaxed prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/5 prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
              dangerouslySetInnerHTML={{ __html: problem.description }}
            />
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {/* Lang Selector */}
          <div className="h-10 border-b border-white/5 bg-[#0d0d0d] flex items-center px-4 gap-3 shrink-0">
            {[{ v: 'node', l: 'JavaScript' }, { v: 'python', l: 'Python' }, { v: 'java', l: 'Java' }, { v: 'cpp', l: 'C++' }].map(lg => (
              <button key={lg.v} onClick={() => { setLanguage(lg.v); setCode(STARTER[lg.v]); }}
                className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${language === lg.v ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-500 hover:text-slate-300'}`}>
                {lg.l}
              </button>
            ))}
          </div>
          <Editor
            height="100%"
            language={language === 'node' ? 'javascript' : language}
            theme="vs-dark"
            value={code}
            onChange={v => setCode(v || '')}
            options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", padding: { top: 12 }, scrollBeyondLastLine: false }}
          />
        </div>
      </div>
    </div>
  );
}
