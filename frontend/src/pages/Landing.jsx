import { motion } from 'framer-motion';
import { Code2, Trophy, Rocket, ArrowRight, ShieldCheck, Zap, Users, Star, CheckCircle, Terminal, GitBranch } from 'lucide-react';
import { Link } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.1, ease: 'easeOut' } })
};

const FEATURES = [
  { icon: <ShieldCheck className="w-6 h-6 text-green-400" />, bg: 'bg-green-400/10 border-green-400/20', title: 'Docker Sandbox', desc: 'Fully isolated, network-disabled Alpine Linux containers.' },
  { icon: <Zap className="w-6 h-6 text-yellow-400" />, bg: 'bg-yellow-400/10 border-yellow-400/20', title: 'Instant Execution', desc: 'BullMQ-backed job queue keeps submissions blazingly fast.' },
  { icon: <Trophy className="w-6 h-6 text-violet-400" />, bg: 'bg-violet-400/10 border-violet-400/20', title: 'XP & Leaderboard', desc: 'Gamified progression system with daily streaks & global ranks.' },
  { icon: <Users className="w-6 h-6 text-blue-400" />, bg: 'bg-blue-400/10 border-blue-400/20', title: 'Live Interviews', desc: 'Real-time collaborative coding rooms with WebSocket sync.' },
  { icon: <GitBranch className="w-6 h-6 text-orange-400" />, bg: 'bg-orange-400/10 border-orange-400/20', title: 'Multi-Language', desc: 'JavaScript, Python 3, Java, and C++ in a premium Monaco editor.' },
  { icon: <Star className="w-6 h-6 text-pink-400" />, bg: 'bg-pink-400/10 border-pink-400/20', title: 'Problem Library', desc: '500+ curated problems covering all interview topics.' },
];

export default function Landing() {
  return (
    <div className="bg-[#000] text-slate-100 font-sans overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-primary/12 blur-[180px] rounded-full" />
          <div className="absolute bottom-0 right-[-10%] w-[400px] h-[400px] bg-violet-600/10 blur-[150px] rounded-full" />
          {/* Dot grid */}
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_50%,transparent_100%)]" />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-4xl mx-auto flex flex-col items-center"
        >
          {/* CodeArena Brand Lockup */}
          <motion.div variants={fadeUp} custom={0} className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-[0_0_35px_rgba(59,130,246,0.5)]">
              <Code2 className="w-7 h-7 text-white" />
            </div>
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              Code<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Arena</span>
            </span>
          </motion.div>

          {/* Live badge */}
          <motion.div variants={fadeUp} custom={0.5}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-400 backdrop-blur-sm">
            <span className="flex h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
            CodeArena v2.0 is Live
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fadeUp} custom={1}
            className="text-5xl sm:text-6xl lg:text-[4.5rem] font-extrabold tracking-tight text-white mb-5 leading-[1.08]">
            Practice. Compete.<br />
            <span className="bg-gradient-to-r from-blue-400 via-primary to-violet-400 bg-clip-text text-transparent">
              Get Hired.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p variants={fadeUp} custom={2}
            className="text-base sm:text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
            <strong className="text-slate-200">CodeArena</strong> is the platform where developers sharpen problem-solving skills, ace technical interviews, and track their growth — all in a Docker-isolated, instant-feedback coding environment.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3">
            <Link to="/register">
              <button className="px-9 py-3.5 rounded-xl bg-primary hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-[0_0_30px_rgba(59,130,246,0.35)] hover:shadow-[0_0_45px_rgba(59,130,246,0.55)] hover:scale-[1.02] active:scale-95 flex items-center gap-2">
                <Rocket className="w-4 h-4" /> Start Coding
              </button>
            </Link>
            <Link to="/arena">
              <button className="px-9 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all flex items-center gap-2">
                Try a Problem <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── PLATFORM METRICS ─────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-[#050505]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/5 text-center">
          {[
            { value: 'True', label: 'Docker Isolation' },
            { value: '4',    label: 'Languages Supported' },
            { value: '< 1s', label: 'Execution Time' },
            { value: 'Real', label: 'Interview Scenarios' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center px-4 py-6">
              <span className="text-2xl font-black text-white">{s.value}</span>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-widest leading-tight">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-28">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-bold text-primary uppercase tracking-widest mb-3">How CodeArena works</motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-extrabold text-white">From problem to hired in three steps.</motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-slate-500 text-sm mt-3 max-w-xl mx-auto">The fastest path from beginner to interview-ready. No fluff, just code.</motion.p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              icon: <Terminal className="w-5 h-5 text-primary" />,
              bg: 'border-primary/20 bg-primary/5',
              title: 'Pick a Challenge',
              desc: 'Browse curated problems by difficulty, topic, or company tag. Easy to Hard — there is always a next level.'
            },
            {
              step: '02',
              icon: <Code2 className="w-5 h-5 text-violet-400" />,
              bg: 'border-violet-400/20 bg-violet-400/5',
              title: 'Write Your Solution',
              desc: 'Use our Monaco-powered editor (the same one in VS Code). Switch between JS, Python, Java, or C++ instantly.'
            },
            {
              step: '03',
              icon: <CheckCircle className="w-5 h-5 text-green-400" />,
              bg: 'border-green-400/20 bg-green-400/5',
              title: 'Get Instant Feedback',
              desc: 'Your code runs in an isolated Docker sandbox. Pass all test cases to earn XP and climb the global leaderboard.'
            }
          ].map((card, i) => (
            <motion.div key={card.step}
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="relative p-6 rounded-2xl bg-[#080808] border border-white/5 hover:border-white/10 transition-colors group">
              <div className="absolute top-5 right-5 text-5xl font-black text-white/3 select-none">{card.step}</div>
              <div className={`w-10 h-10 rounded-xl ${card.bg} border flex items-center justify-center mb-5`}>
                {card.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-primary transition-colors">{card.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES MARQUEE ──────────────────────────────── */}
      <section className="bg-[#050505] border-y border-white/5 py-24 relative overflow-hidden flex flex-col items-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16 relative z-10 px-6">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Platform Arsenal</motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-extrabold text-white">Built for serious engineers.</motion.h2>
        </motion.div>

        {/* Marquee Gradients for fading edges */}
        <div className="absolute top-0 left-0 w-32 md:w-64 h-full bg-gradient-to-r from-[#050505] to-transparent z-20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 md:w-64 h-full bg-gradient-to-l from-[#050505] to-transparent z-20 pointer-events-none" />

        <div className="w-full relative flex items-center group">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 35 }}
            className="flex w-max gap-6 px-3 hover:[animation-play-state:paused]"
          >
            {/* Double the features array to create a seamless infinite scroll effect */}
            {[...FEATURES, ...FEATURES].map((feat, i) => (
              <div key={i} className="w-[380px] p-6 rounded-2xl border border-white/5 bg-[#0a0a0a] flex-shrink-0 flex items-start gap-5 hover:border-white/10 hover:bg-[#111] transition-colors cursor-default">
                <div className={`w-14 h-14 rounded-2xl ${feat.bg} border shrink-0 flex items-center justify-center shadow-lg`}>
                  {feat.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────── */}
      <section className="relative py-28 px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 to-violet-600/8" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-extrabold text-white mb-5">
            Ready to enter the Arena?
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-slate-400 mb-8 text-base">
            Thousands of engineers use <strong className="text-slate-200">CodeArena</strong> every day to practice, compete, and land their dream roles. Your next breakthrough is one problem away.
          </motion.p>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register">
              <button className="px-10 py-3.5 rounded-xl bg-white text-black font-extrabold text-sm hover:bg-slate-100 transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-2">
                Create Free Account <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/login">
              <button className="px-10 py-3.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 text-white font-semibold text-sm transition-all">
                Sign In
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#050505] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.4)]">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-white tracking-tight">CodeArena</span>
          </div>
          <div className="flex gap-6 text-xs text-slate-600 font-medium">
            <Link to="/login" className="hover:text-slate-300 transition-colors">Login</Link>
            <Link to="/register" className="hover:text-slate-300 transition-colors">Register</Link>
            <Link to="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
            <Link to="/arena" className="hover:text-slate-300 transition-colors">Practice</Link>
          </div>
          <p className="text-xs text-slate-700">© 2025 CodeArena. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
