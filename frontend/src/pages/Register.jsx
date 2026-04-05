import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, KeyRound, Mail, User, ArrowRight, Check, X, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP

  // Real-time checks
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      if (username.length < 3) {
        setUsernameAvailable(null);
        return;
      }
      try {
        const res = await axios.get(`http://localhost:5000/api/v1/auth/check-username?username=${username}`);
        setUsernameAvailable(!res.data.exists);
      } catch (e) {
        setUsernameAvailable(null);
      }
    };
    const timeout = setTimeout(checkUser, 600);
    return () => clearTimeout(timeout);
  }, [username]);

  useEffect(() => {
    const checkEmail = async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailAvailable(null);
        return;
      }
      try {
        const res = await axios.get(`http://localhost:5000/api/v1/auth/check-email?email=${email}`);
        setEmailAvailable(!res.data.exists);
      } catch (e) {
        setEmailAvailable(null);
      }
    };
    const timeout = setTimeout(checkEmail, 600);
    return () => clearTimeout(timeout);
  }, [email]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return setError('Please enter a valid email address.');
    if (usernameAvailable === false) return setError('Username is already taken.');
    if (emailAvailable === false) return setError('Email is already registered.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    
    setError('');
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/v1/auth/send-otp', {
        username,
        email
      });
      setStep(2); // Go to OTP step
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return setError('Please enter the 6-digit OTP.');
    
    setError('');
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/v1/auth/register', {
        username,
        email,
        password,
        otp
      });
      const { token, ...user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register. Your OTP may be invalid.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/15 blur-[120px] rounded-full point-events-none" />
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/15 blur-[100px] rounded-full point-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }} className="relative z-10 w-full max-w-md">
        
        <div className="bg-surface/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1, type: "spring", bounce: 0.5 }}
              className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mb-4 border border-accent/30">
              <Terminal className="w-8 h-8 text-accent" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Create Profile
            </h1>
            <p className="text-slate-400 mt-2 text-sm text-center">
              {step === 1 ? 'Join the competitive coding network' : 'Check your email for the verification code'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form key="step1" onSubmit={handleSendOTP} 
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Username</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-accent transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                      className={`w-full pl-12 pr-10 py-3 bg-white/5 border ${usernameAvailable === false ? 'border-red-500/50' : 'border-white/10'} rounded-xl outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all text-white placeholder-slate-500`}
                      placeholder="code_ninja" required />
                    {usernameAvailable === true && <Check className="absolute right-4 top-3.5 w-5 h-5 text-green-400" />}
                    {usernameAvailable === false && <X className="absolute right-4 top-3.5 w-5 h-5 text-red-400" />}
                  </div>
                  {usernameAvailable === false && <p className="text-red-400 text-xs mt-1 ml-1">Username taken</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Email</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-accent transition-colors">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-12 pr-10 py-3 bg-white/5 border ${emailAvailable === false ? 'border-red-500/50' : 'border-white/10'} rounded-xl outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all text-white placeholder-slate-500`}
                      placeholder="developer@domain.com" required />
                    {emailAvailable === true && <Check className="absolute right-4 top-3.5 w-5 h-5 text-green-400" />}
                    {emailAvailable === false && <X className="absolute right-4 top-3.5 w-5 h-5 text-red-400" />}
                  </div>
                  {emailAvailable === false && <p className="text-red-400 text-xs mt-1 ml-1">Email already registered</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-accent transition-colors">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <input
                      type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all text-white placeholder-slate-500"
                      placeholder="••••••••••••" required />
                  </div>
                </div>

                <motion.button
                  disabled={loading || usernameAvailable === false || emailAvailable === false || password.length < 6}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="w-full mt-6 bg-accent hover:bg-cyan-500 text-slate-900 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors relative overflow-hidden group shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className="relative z-10 flex items-center gap-2">
                    {loading ? 'Sending OTP...' : 'Continue'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </motion.button>
              </motion.form>
            ) : (
              <motion.form key="step2" onSubmit={handleRegister}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-4">
                
                <div className="text-center p-4 bg-white/5 border border-white/10 rounded-xl mb-6">
                  <p className="text-slate-300 text-sm mb-1">Code sent to:</p>
                  <p className="text-accent font-medium">{email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Authentication Code</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-accent transition-colors">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <input
                      type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all text-white placeholder-slate-600 tracking-[0.5em] text-center font-bold font-mono"
                      placeholder="••••••" required />
                  </div>
                </div>

                <motion.button
                  disabled={loading || otp.length !== 6}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="w-full mt-6 bg-accent hover:bg-cyan-500 text-slate-900 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors relative overflow-hidden group shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className="relative z-10 flex items-center gap-2">
                    {loading ? 'Deploying...' : 'Verify & Deploy Account'}
                    <Check className="w-4 h-4" />
                  </span>
                </motion.button>

                <div className="text-center mt-4 text-sm">
                  <button type="button" onClick={() => setStep(1)} className="text-slate-400 hover:text-white transition-colors underline-offset-4 hover:underline">
                    Back to edit details
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {step === 1 && (
            <p className="mt-6 text-center text-sm text-slate-400">
              Already a member?{' '}
              <Link to="/login" className="text-accent hover:text-cyan-400 font-medium transition-colors">
                Initialize Login
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}