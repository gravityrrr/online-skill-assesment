import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, ChevronLeft, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else window.location.href = '/dashboard';
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6">
      
      {/* Background Ambience */}
      <div className="ambient-glow bg-indigo-600/20 w-[500px] h-[500px] top-[-10%] right-[-10%]" />
      <div className="ambient-glow bg-sky-600/10 w-[600px] h-[600px] bottom-[-20%] left-[-20%]" />

      <button 
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors z-20"
      >
        <ChevronLeft className="w-5 h-5" /> Back to Home
      </button>

      <div className="glass-panel w-full max-w-md p-10 animate-fade-in relative z-10 mx-auto">
        
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-6">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-3xl heading-bold text-white mb-2">Welcome Back</h1>
          <p className="text-[var(--text-secondary)]">Sign in to your Evalura workspace</p>
        </div>

        {error && (
          <div className="bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger-text)] px-4 py-3 rounded-xl text-sm font-medium mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
            <input 
              type="email" 
              required
              className="input-field pl-12"
              placeholder="Email Address" 
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
            <input 
              type="password" 
              required
              className="input-field pl-12"
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="btn-primary w-full mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[var(--surface-border)] pt-6">
          <p className="text-sm text-[var(--text-secondary)]">
            Forget your password or need access?{' '}
            <button className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">
              Contact Admin
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
