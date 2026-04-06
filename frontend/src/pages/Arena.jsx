import { useState, useEffect, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, CheckCircle, XCircle, Code2, Clock, Terminal, ChevronDown, RotateCcw, AlignLeft, Maximize2, Check, Lightbulb, ChevronRight, Target, MessageCircle, Send, Bot, User } from 'lucide-react';
import axios from 'axios';

export default function Arena() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [language, setLanguage] = useState('java');
  const [code, setCode] = useState('');
  
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setShowLangDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [langDropdownRef]);

  // Monaco editor refs for format / reset actions
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Resizable panels
  const [hSplit, setHSplit] = useState(45); // left panel % width
  const [vSplit, setVSplit] = useState(65); // editor % height in right panel
  const isDraggingH = useRef(false);
  const isDraggingV = useRef(false);
  const containerRef = useRef(null);
  const rightPanelRef = useRef(null);

  const startDragH = (e) => {
    e.preventDefault();
    isDraggingH.current = true;
    const onMove = (ev) => {
      if (!isDraggingH.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setHSplit(Math.min(75, Math.max(20, pct)));
    };
    const onUp = () => { isDraggingH.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startDragV = (e) => {
    e.preventDefault();
    isDraggingV.current = true;
    const onMove = (ev) => {
      if (!isDraggingV.current || !rightPanelRef.current) return;
      const rect = rightPanelRef.current.getBoundingClientRect();
      const pct = ((ev.clientY - rect.top) / rect.height) * 100;
      setVSplit(Math.min(85, Math.max(20, pct)));
    };
    const onUp = () => { isDraggingV.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const [output, setOutput] = useState({
    status: 'idle',
    message: 'Run your code to see results here.',
    details: null,
    earnedXp: 0,
    passedCount: 0,
    totalCount: 0,
    runtimeMs: 0,
    testResults: [], // structured per-test: { index, passed, input, expected, got, error, isHidden, runtimeMs }
  });
  
  const [activeTab, setActiveTab] = useState('testcases'); // 'testcases' | 'output' | 'diagnostics'
  const [hints, setHints] = useState([]);
  const [showHints, setShowHints] = useState(false);
  const [revealedHints, setRevealedHints] = useState(new Set()); // which hint levels have been unlocked
  const [expandedTest, setExpandedTest] = useState(null); // for diagnostic panel

  // AI Chat state
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]); // [{role:'user'|'ai', content:string}]
  const [aiInput, setAiInput] = useState('');
  const [aiSending, setAiSending] = useState(false);
  const aiChatEndRef = useRef(null);

  // Fetch problem on mount + prefetch hints
  useEffect(() => {
    const fetchProblem = async () => {
      setLoading(true);
      try {
        const targetSlug = slug || 'two-sum';
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/problems/${targetSlug}`);
        setProblem(response.data);
        
        const codeSnippets = response.data.codeSnippets || {};
        
        const fallback = {
          node: "function solution() {\n    // Write your code here\n}",
          python: "def solution():\n    # Write your code here\n    pass",
          java: "class Solution {\n    public Object solution() {\n        // Write your code here\n        return null;\n    }\n}",
          cpp: "class Solution {\npublic:\n    auto solution() {\n        // Write your code here\n        return 0;\n    }\n};"
        };
        
        const code = codeSnippets[language] || fallback[language] || "";
        setCode(code);
        
        setOutput({ status: 'idle', message: 'Run your code to see results here.', details: null, earnedXp: 0, passedCount: 0, totalCount: 0, runtimeMs: 0, testResults: [] });

        // Prefetch hints if available (non-blocking)
        const token = localStorage.getItem('token');
        if (token) {
          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/problems/${targetSlug}/hints`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => setHints(r.data.hints || [])).catch(() => {});
        }
      } catch (err) {
        console.error('Error fetching problem:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProblem();
  }, [slug]);

  const STARTER_CODE = useMemo(() => {
    const codeSnippets = problem?.codeSnippets || {};
    return {
      node: codeSnippets.node || `function solution() {\n    // Your code here\n    return null;\n}`,
      python: codeSnippets.python || `def solution():\n    # Write your code here\n    return None`,
      java: codeSnippets.java || `class Solution {\n    public Object solution() {\n        // Write your code here\n        return null;\n    }\n}`,
      cpp: codeSnippets.cpp || `class Solution {\npublic:\n    auto solution() {\n        // Write your code here\n        return 0;\n    }\n};`,
    };
  }, [problem]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(STARTER_CODE[newLang] || STARTER_CODE.node);
  };

  // In-app reset confirmation modal (no browser dialog)
  const [showResetModal, setShowResetModal] = useState(false);
  const handleReset = () => setShowResetModal(true);
  const confirmReset = () => {
    setCode(STARTER_CODE[language] || STARTER_CODE.node);
    setShowResetModal(false);
  };

  // Trigger Monaco's built-in document formatter
  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  const pollSubmission = async (submissionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const sub = response.data;
      const { status, result, passedCount, totalCount, runtimeMs } = sub;
      
      if (status === 'Pass') {
        const xpMap = { Easy: 15, Medium: 25, Hard: 50 };
        const earnedXp = xpMap[problem?.difficulty] || 25;
        setOutput({
          status: 'success',
          message: `All ${passedCount || 'all'} test cases passed!`,
          details: sub.output || '',
          earnedXp,
          passedCount: passedCount || 0,
          totalCount: totalCount || 0,
          runtimeMs: runtimeMs || 0,
          testResults: sub.testResults || [],
        });
        setActiveTab((sub.testResults && sub.testResults.length) ? 'diagnostics' : 'output');
      } else if (status === 'Fail') {
        setOutput({
          status: 'error',
          message: `${(totalCount || 0) - (passedCount || 0)} of ${totalCount || 0} test cases failed.`,
          details: sub.output || '',
          earnedXp: 0,
          passedCount: passedCount || 0,
          totalCount: totalCount || 0,
          runtimeMs: runtimeMs || 0,
          testResults: sub.testResults || [],
        });
        setActiveTab((sub.testResults && sub.testResults.length) ? 'diagnostics' : 'output');
      } else if (status === 'Error') {
        setOutput({
          status: 'error',
          message: sub.output || 'Runtime Error.',
          details: null,
          earnedXp: 0,
          passedCount: 0,
          totalCount: 0,
          runtimeMs: 0,
          testResults: [],
        });
        setActiveTab('output');
      } else {
        // Still pending - poll again
        setTimeout(() => pollSubmission(submissionId), 1200);
      }
    } catch (err) {
      setOutput({
        status: 'error',
        message: 'Error fetching execution results. Please try again.',
        details: null,
        earnedXp: 0,
      });
    }
  };

  const handleRunCode = async (isSubmit = false) => {
    if (!problem) return;
    
    // Change state so we know if we are running or submitting (for UI text)
    setOutput({ status: 'running', message: isSubmit ? 'Submitting to judge...' : 'Executing in secure sandbox...', details: null, isSubmitMode: isSubmit });
    setActiveTab('output');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setOutput({ status: 'error', message: 'You must be logged in to submit code.', details: null });
        return;
      }

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/problems/${problem._id}/submit`, {
        code,
        language,
        type: isSubmit ? 'submit' : 'run'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Start polling
      pollSubmission(response.data.submissionId);

    } catch (err) {
      setOutput({
        status: 'error',
        message: err.response?.data?.message || 'Failed to submit code.',
        details: null
      });
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (aiChatOpen) aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiChatOpen]);

  const sendAiMessage = async (overrideMessage) => {
    const message = overrideMessage ?? aiInput.trim();
    if (!message || aiSending) return;
    if (!overrideMessage) setAiInput('');

    const newHistory = [...aiMessages, { role: 'user', content: message }];
    setAiMessages(newHistory);
    setAiSending(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/problems/${problem.slug}/ask-ai`, {
        code,
        language,
        userMessage: message,
        history: newHistory.slice(0, -1).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAiMessages(prev => [...prev, { role: 'ai', content: response.data.hint }]);
    } catch (err) {
      setAiMessages(prev => [...prev, { role: 'ai', content: '⚠️ ' + (err.response?.data?.message || 'Failed to get AI response. Check GEMINI_API_KEY.') }]);
    } finally {
      setAiSending(false);
    }
  };

  const openAiChat = () => {
    setAiChatOpen(true);
    // Auto-send initial code review if chat is empty
    if (aiMessages.length === 0) {
      sendAiMessage('Please review my current code and give me a contextual hint.');
    }
  };

  if (loading || !problem) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-sans bg-[#000000] min-h-0 overflow-hidden">
      {/* Workspace Sub-Header */}
      <header className="h-[56px] border-b border-white/5 flex items-center justify-between px-4 bg-[#0d0d0d] z-10 shrink-0 gap-4">
        {/* Left: problem identity */}
        <div className="flex items-center gap-3 min-w-0 text-sm font-bold">
          <button onClick={() => navigate('/problems')} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
            <Code2 className="w-4 h-4" />
            <span>Problems</span>
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-white truncate">{problem.title.replace(/^\d+\.\s*/, '')}</span>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language Dropdown Selector */}
          <div className="relative" ref={langDropdownRef}>
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#111] hover:bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-slate-300 transition-colors"
            >
              {[
                { value: 'node', label: 'JavaScript' },
                { value: 'python', label: 'Python' },
                { value: 'java', label: 'Java' },
                { value: 'cpp', label: 'C++' },
              ].find(l => l.value === language)?.label || 'JS'}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showLangDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 top-full mt-2 w-36 bg-[#111] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 py-1"
                >
                  {[
                    { value: 'node', label: 'JavaScript', color: 'text-yellow-400' },
                    { value: 'python', label: 'Python', color: 'text-blue-400' },
                    { value: 'java', label: 'Java', color: 'text-orange-400' },
                    { value: 'cpp', label: 'C++', color: 'text-violet-400' },
                  ].map(lang => (
                    <button
                      key={lang.value}
                      onClick={() => {
                        handleLanguageChange({ target: { value: lang.value } });
                        setShowLangDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 flex items-center justify-between text-xs font-bold hover:bg-white/5 transition-colors group"
                    >
                      <span className={language === lang.value ? lang.color : 'text-slate-400 group-hover:text-slate-200'}>
                        {lang.label}
                      </span>
                      {language === lang.value && <Check className={`w-3.5 h-3.5 ${lang.color}`} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Separator */}
          <div className="w-px h-6 bg-white/8" />

          {/* Editor toolbar: Reset + Format */}
          <button onClick={handleReset} title="Reset to boilerplate"
            className="p-2 rounded-lg text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 border border-transparent hover:border-orange-500/20 transition-all">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={handleFormat} title="Format code"
            className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all">
            <AlignLeft className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-white/8" />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleRunCode(false)}
            disabled={output.status === 'running'}
            className="group relative flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden">
            <Play className="w-3.5 h-3.5 fill-white relative z-10" />
            <span className="relative z-10 tracking-wide">Run</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleRunCode(true)}
            disabled={output.status === 'running'}
            className="group relative flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-lg font-bold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_28px_rgba(16,185,129,0.45)] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden">
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            {output.status === 'running' && output.isSubmitMode
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
              : <Play className="w-3.5 h-3.5 fill-white relative z-10" />
            }
            <span className="relative z-10 tracking-wide">{(output.status === 'running' && output.isSubmitMode) ? 'Submitting...' : 'Submit Code'}</span>
          </motion.button>
        </div>
      </header>

      {/* Main Workspace */}
      <div ref={containerRef} className="flex-1 flex min-h-0 overflow-hidden select-none">
        
        {/* Left Panel: Problem Description */}
        <div style={{ width: `${hSplit}%` }} className="flex flex-col bg-[#050505] min-h-0 overflow-hidden">
          <div className="h-10 border-b border-white/5 flex items-center px-4 bg-[#0a0a0a] shrink-0 gap-4">
            <div className="py-2 border-b-2 border-primary text-xs font-bold text-white tracking-wide">
              Description
            </div>
            {hints.length > 0 && (
              <button onClick={() => setShowHints(h => !h)}
                className={`py-2 flex items-center gap-1.5 text-xs font-bold transition-colors ml-auto ${
                  showHints ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'
                }`}>
                <Lightbulb className="w-3.5 h-3.5" />
                Hints ({hints.length})
              </button>
            )}
            <button onClick={openAiChat}
              className="py-1 px-3 flex items-center gap-1.5 text-xs font-bold transition-all bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg">
              <MessageCircle className="w-3.5 h-3.5" />
              Ask AI {aiMessages.length > 0 && <span className="bg-purple-500/30 text-purple-300 rounded-full px-1.5 py-0.5 text-[9px] font-black">{aiMessages.length}</span>}
            </button>
          </div>
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
            {/* AI Chat Panel — replaces the old one-shot hint panel */}
            <AnimatePresence>
              {aiChatOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 bg-[#0d0b15] border border-purple-500/25 rounded-xl overflow-hidden flex flex-col"
                >
                  {/* Chat header */}
                  <div className="px-4 py-3 border-b border-purple-500/15 flex items-center gap-2 bg-purple-500/5 shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-purple-400">AI Teaching Assistant</span>
                      <p className="text-[10px] text-purple-500/70">Ask anything about this problem</p>
                    </div>
                    <button
                      onClick={() => setAiChatOpen(false)}
                      className="text-slate-600 hover:text-white transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 max-h-[300px] overflow-y-auto custom-scrollbar p-3 space-y-3">
                    {aiMessages.length === 0 && aiSending && (
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/15 rounded-xl px-3 py-2">
                          <div className="flex gap-1 items-center h-4">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                          </div>
                        </div>
                      </div>
                    )}
                    {aiMessages.map((msg, i) => (
                      <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          msg.role === 'user' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                        }`}>
                          {msg.role === 'user'
                            ? <User className="w-3.5 h-3.5 text-blue-400" />
                            : <Bot className="w-3.5 h-3.5 text-purple-400" />
                          }
                        </div>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-blue-500/15 border border-blue-500/20 text-slate-200'
                            : 'bg-purple-500/10 border border-purple-500/15 text-slate-300'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {aiSending && aiMessages.length > 0 && (
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/15 rounded-xl px-3 py-2">
                          <div className="flex gap-1 items-center h-4">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={aiChatEndRef} />
                  </div>

                  {/* Quick prompts */}
                  {aiMessages.length <= 1 && (
                    <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                      {[
                        'What algorithm should I use?',
                        'Why is my solution wrong?',
                        'What is the time complexity?',
                      ].map(q => (
                        <button
                          key={q}
                          onClick={() => sendAiMessage(q)}
                          disabled={aiSending}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-purple-500/15 border border-white/5 hover:border-purple-500/20 text-slate-400 hover:text-purple-300 transition-all disabled:opacity-40"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="px-3 pb-3 shrink-0">
                    <div className="flex gap-2 items-end">
                      <textarea
                        value={aiInput}
                        onChange={e => setAiInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendAiMessage();
                          }
                        }}
                        placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
                        rows={2}
                        disabled={aiSending}
                        className="flex-1 bg-black/40 border border-white/10 focus:border-purple-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition-colors resize-none custom-scrollbar disabled:opacity-50"
                      />
                      <button
                        onClick={() => sendAiMessage()}
                        disabled={!aiInput.trim() || aiSending}
                        className="p-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-white/5 disabled:text-slate-600 text-white rounded-xl transition-all shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hints Panel */}
            <AnimatePresence>
              {showHints && hints.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mb-6 bg-yellow-500/5 border border-yellow-500/20 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-yellow-500/15 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400">Progressive Hints</span>
                    <span className="text-[10px] text-yellow-600 ml-auto">Reveal from easiest to hardest</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {hints.map((hint, i) => {
                      const isRevealed = revealedHints.has(hint.level);
                      const canReveal = hint.level === 1 || revealedHints.has(hint.level - 1);
                      return (
                        <div key={hint.level} className={`rounded-lg border p-3 transition-all ${
                          isRevealed ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-black/30 border-white/5'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-yellow-500/70 uppercase tracking-wider">
                              {['', 'Conceptual', 'Approach', 'Near Solution'][hint.level]} Hint
                            </span>
                            {!isRevealed && (
                              <button
                                disabled={!canReveal}
                                onClick={() => setRevealedHints(s => new Set([...s, hint.level]))}
                                className="text-[10px] text-yellow-400 hover:text-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed font-bold">
                                {canReveal ? 'Reveal' : 'Unlock prev first'}
                              </button>
                            )}
                          </div>
                          {isRevealed
                            ? <p className="text-sm text-slate-300">{hint.text}</p>
                            : <p className="text-sm text-slate-600 blur-[3px] select-none">This hint is hidden until revealed.</p>
                          }
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <h1 className="text-2xl font-black text-white mb-4 tracking-tight">{problem.title.replace(/^\d+\.\s*/, '')}</h1>
            <div className="flex items-center gap-3 mb-8">
               <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-widest uppercase border ${
                 problem.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                 problem.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                 'bg-red-500/10 text-red-400 border-red-500/20'
               }`}>{problem.difficulty}</span>
               {problem.tags && problem.tags.slice(0, 3).map(tag => (
                 <span key={tag} className="text-[11px] font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{tag}</span>
               ))}
            </div>

            {/* We render the raw HTML from LeetCode or our DB */}
            <div 
              className="prose prose-invert prose-slate text-sm max-w-none prose-p:leading-relaxed prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/5 prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-a:text-blue-400"
              dangerouslySetInnerHTML={{ __html: problem.description || 'No description provided.' }}
            />
            
            <div className="mt-8 flex gap-2 flex-wrap pb-6">
              {problem.tags && problem.tags.map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-white/5 text-slate-400 text-[10px] font-bold tracking-widest uppercase border border-white/10">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Horizontal Drag Divider */}
        <div
          onMouseDown={startDragH}
          className="w-1.5 shrink-0 bg-white/5 hover:bg-primary/50 cursor-col-resize transition-colors duration-150 group flex items-center justify-center"
        >
          <div className="w-px h-8 bg-white/20 group-hover:bg-primary rounded-full" />
        </div>

        {/* Right Panel: Editor & Output */}
        <div ref={rightPanelRef} style={{ width: `${100 - hSplit}%` }} className="flex flex-col bg-[#0d0d0d] min-h-0 overflow-hidden">
          
          {/* Editor Area */}
          <div style={{ height: `${vSplit}%` }} className="relative overflow-hidden shrink-0">
            
            {/* Success Overlay Animation */}
            <AnimatePresence>
              {output.status === 'success' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-green-500/5 backdrop-blur-[2px]"
                >
                  <motion.div 
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="bg-black/80 border border-green-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(34,197,94,0.2)] flex flex-col items-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight mb-2">Accepted!</h3>
                    <p className="text-green-400 font-bold text-lg">+{output.earnedXp || 25} XP Earned</p>
                    {output.runtimeMs > 0 && <p className="text-slate-400 text-sm mt-1">{output.runtimeMs}ms runtime</p>}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <Editor
              height="100%"
              language={language === 'node' ? 'javascript' : language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={(editor) => { editorRef.current = editor; }}
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineHeight: 24,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                wordBasedSuggestions: "allDocuments",
                scrollbar: {
                  vertical: "visible",
                  horizontal: "visible"
                }
              }}
            />
          </div>

          {/* Vertical Drag Divider */}
          <div
            onMouseDown={startDragV}
            className="h-1.5 shrink-0 bg-white/5 hover:bg-primary/50 cursor-row-resize transition-colors duration-150 group flex items-center justify-center"
          >
            <div className="h-px w-8 bg-white/20 group-hover:bg-primary rounded-full" />
          </div>

          {/* Bottom Console Panel */}
          <div style={{ height: `${100 - vSplit}%` }} className="border-t border-surface/50 bg-[#1e1e1e] flex flex-col overflow-hidden shrink-0">
            
            {/* Tabs */}
            <div className="h-10 bg-[#252526] border-b border-surface/50 flex items-center px-2">
              <button 
                onClick={() => setActiveTab('testcases')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'testcases' ? 'text-white border-b-2 border-primary' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Check className="w-4 h-4" /> Test Cases
              </button>
              <button 
                onClick={() => setActiveTab('output')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'output' ? 'text-white border-b-2 border-primary' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Terminal className="w-4 h-4" /> Output
              </button>
              {output.testResults && output.testResults.length > 0 && (
                <button 
                  onClick={() => setActiveTab('diagnostics')}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'diagnostics' ? 'text-white border-b-2 border-primary' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Target className="w-4 h-4" /> Diagnostics
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 ${
                    output.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>{output.passedCount}/{output.totalCount}</span>
                </button>
              )}
            </div>
            
            {/* Console Body */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono text-sm">
              
              {activeTab === 'testcases' && (
                <div className="space-y-4">
                  {problem.testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                    <div key={idx} className="bg-[#2d2d2d] rounded-lg p-3 border border-white/5">
                      <div className="font-bold text-slate-300 mb-2">Case {idx + 1}</div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-500 block mb-1">Input:</span>
                          <div className="bg-[#1e1e1e] p-2 rounded text-slate-300">
                            {JSON.stringify(tc.input)}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Expected Output:</span>
                          <div className="bg-[#1e1e1e] p-2 rounded text-slate-300">
                            {JSON.stringify(tc.expectedOutput)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'diagnostics' && output.testResults.length > 0 && (
                <div className="space-y-2">
                  {output.testResults.map((tc, idx) => (
                    <div key={idx}>
                      <button onClick={() => setExpandedTest(expandedTest === idx ? null : idx)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left">
                        <div className="flex items-center gap-2">
                          {tc.passed ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                          <span className={`text-xs font-semibold ${tc.passed ? 'text-green-400' : 'text-red-400'}`}>Case {tc.index}</span>
                          {tc.isHidden && <span className="text-[10px] text-slate-500">Hidden</span>}
                          {tc.runtimeMs > 0 && <span className="text-[10px] text-slate-500">{tc.runtimeMs}ms</span>}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedTest === idx ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {expandedTest === idx && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                            className="overflow-hidden border-t border-white/5">
                            {tc.isHidden
                              ? <p className="p-3 text-xs text-slate-500">Hidden test — input not shown.</p>
                              : <div className="p-3 space-y-2 font-mono text-xs">
                                  <div><span className="text-slate-500">Input: </span>
                                    <span className="text-slate-300">{JSON.stringify(tc.input)}</span></div>
                                  <div><span className="text-slate-500">Expected: </span>
                                    <span className="text-green-400">{JSON.stringify(tc.expected)}</span></div>
                                  {!tc.passed && (
                                    <div><span className="text-slate-500">Got: </span>
                                      <span className="text-red-400">
                                        {tc.error ? 'Error: ' + tc.error : JSON.stringify(tc.got)}
                                      </span></div>
                                  )}
                                </div>
                            }
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'output' && (
                <div>
                  {output.status === 'idle' &&
                    <span className="text-slate-500">{output.message}</span>
                  }
                  
                  {output.status === 'running' &&
                    <span className="text-primary animate-pulse">{output.message}</span>
                  }
                  
                  {output.status === 'error' && !output.details && (
                    <div className="text-red-400 whitespace-pre-line bg-red-400/10 p-4 rounded-xl border border-red-400/20">
                      <div className="font-bold flex items-center gap-2 mb-2"><XCircle className="w-4 h-4"/> Runtime Error</div>
                      <div className="font-mono text-sm">{output.message}</div>
                    </div>
                  )}

                {(output.status === 'success' || (output.status === 'error' && output.details)) && (
                    <div className="space-y-4 max-w-4xl">
                      <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${output.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                        {output.status === 'success' ? 'Accepted' : 'Wrong Answer'}
                      </h2>
                      
                      <div className="flex gap-4">
                         {output.runtimeMs > 0 && (
                           <div className="flex bg-[#1e1e1e] p-3 rounded-lg border border-white/5 gap-3 pr-8 min-w-[120px]">
                              <div className="flex items-center justify-center text-slate-500"><Clock className="w-5 h-5"/></div>
                              <div>
                                 <div className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-400 transition-colors">Runtime</div>
                                 <div className="font-bold text-white tracking-wide">{output.runtimeMs}<span className="text-slate-500 font-normal ml-0.5">ms</span></div>
                              </div>
                           </div>
                         )}
                         {output.totalCount > 0 && (
                           <div className="flex bg-[#1e1e1e] p-3 rounded-lg border border-white/5 gap-3 pr-8 min-w-[120px]">
                              <div className="flex items-center justify-center text-slate-500"><CheckCircle className="w-5 h-5" /></div>
                              <div>
                                 <div className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-400 transition-colors">Test Cases</div>
                                 <div className="font-bold text-white tracking-wide">{output.passedCount} <span className="text-slate-500 font-normal">/ {output.totalCount}</span></div>
                              </div>
                           </div>
                         )}
                      </div>
                      
                      <div className="mt-6">
                        {output.details && output.details.includes('AI Evaluation Verdict') ? (
                          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 shadow-inner">
                            <div className="flex items-center gap-2 mb-3">
                              <Lightbulb className="w-5 h-5 text-purple-400" />
                              <span className="font-black text-purple-400 text-sm tracking-wide">AI Evaluation Verdict</span>
                            </div>
                            <div className="prose prose-invert prose-purple max-w-none text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                               {output.details.replace('🤖 AI Evaluation Verdict:\\n', '').replace('🤖 AI Evaluation Verdict:\n', '')}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#1e1e1e] rounded-xl p-5 border border-white/5 shadow-inner">
                            <div className="text-slate-500 text-xs text-[10px] font-bold uppercase tracking-widest mb-3">Raw Sandbox Output</div>
                            <div className="whitespace-pre-wrap font-mono text-slate-300 bg-black/40 p-4 rounded-lg border border-white/5 max-h-[300px] overflow-y-auto custom-scrollbar text-sm">
                               {output.details || 'No output generated.'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowResetModal(false)}>
            <motion.div
              initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-80 shadow-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-orange-400" />
                </div>
                <h3 className="font-bold text-white text-base">Reset Code?</h3>
              </div>
              <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                This will restore the <span className="text-white font-semibold">starter template</span> for your selected language. Your current code will be lost.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 text-sm font-semibold transition-all">
                  Cancel
                </button>
                <button onClick={confirmReset}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold transition-all flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}