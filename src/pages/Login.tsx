import React, { useState } from 'react';
import { authService } from '../services/authService';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Make sure Email/Password auth is enabled.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] flex items-center justify-center p-6 font-sans selection:bg-[#b4945c] selection:text-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white border border-[#E4E3E0] p-12 relative overflow-hidden group shadow-[20px_20px_60px_#e4e3e0,-20px_-20px_60px_#ffffff]"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_center,_rgba(180,148,92,0.05)_0%,_transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        <div className="flex flex-col items-center mb-12">
          <h1 className="text-4xl font-serif italic text-[#141414] tracking-tight mb-2 flex items-baseline gap-1">
            TaskMaster <span className="text-[10px] non-italic font-sans font-bold text-[#b4945c] tracking-widest uppercase align-middle">Core</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#999] font-bold">
            Administrative Access
          </p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-8">
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-bold tracking-widest text-[#999] ml-1">Email Terminal</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CCC]" size={14} />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#F9F9F8] border border-[#E4E3E0] pl-10 pr-4 py-4 text-xs text-[#141414] focus:border-[#b4945c] outline-none transition-all placeholder:text-[#BBB]"
                placeholder="identity@taskmaster.net"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-bold tracking-widest text-[#999] ml-1">Key sequence</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CCC]" size={14} />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#F9F9F8] border border-[#E4E3E0] pl-10 pr-4 py-4 text-xs text-[#141414] focus:border-[#b4945c] outline-none transition-all placeholder:text-[#BBB]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] uppercase font-bold tracking-wider text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#141414] text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#222] transition-colors flex items-center justify-center gap-2 group/btn active:scale-[0.98]"
          >
            {loading ? 'Validating...' : (
              <>
                <LogIn size={14} />
                Initialize Session
              </>
            )}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-[#F0F0F0] text-center">
          <p className="text-[10px] text-[#CCC] uppercase tracking-widest leading-loose">
            System is running in <span className="text-[#b4945c] font-bold">Local Autonomy Mode</span>. All data is stored in your terminal session.
            <br />
            Use <span className="text-[#666] font-bold">any email</span> to initialize a profile.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
