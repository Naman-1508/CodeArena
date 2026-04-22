import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';

export default function SSOCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="bg-surface/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 border border-primary/30">
          <Terminal className="w-8 h-8 text-primary" />
        </motion.div>
        <h2 className="text-xl font-bold text-white mb-2">Authenticating...</h2>
        <p className="text-slate-400">Please wait while we log you in.</p>
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  );
}
