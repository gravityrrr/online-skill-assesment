import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Network, Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Explicit network bridging directly via Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else window.location.href = '/dashboard';
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="ambient-glow" style={{ background: 'var(--neon-cyan)', width: 600, height: 600, top: '-200px', right: '-200px', opacity: 0.12 }} />
      <div className="ambient-glow" style={{ background: 'var(--neon-pink)', width: 500, height: 500, bottom: '-100px', left: '-100px', opacity: 0.12 }} />
      
      <div className="glass-panel auth-card animate-entrance">
        <div className="auth-header">
          <Network size={64} color="var(--neon-cyan)" />
          <h1 className="auth-title">SYSTEM LOGIN</h1>
          <p className="auth-subtitle">React & Vite Native Boot Sequence</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-block">
            <Mail className="input-icon" size={20} />
            <input 
              type="email" 
              required
              className="input-premium" 
              placeholder="Email Address" 
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          
          <div className="input-block">
            <Lock className="input-icon" size={20} />
            <input 
              type="password" 
              required
              className="input-premium" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="neon-btn full-width">
            {loading ? 'AUTHENTICATING...' : 'INITIALIZE REACT PROTOCOL'}
          </button>
        </form>

        <div className="login-footer">
          <button onClick={() => alert('React Registration Route coming next!')} className="text-btn">
            REACT REGISTRATION MIGRATION IN PROGRESS
          </button>
        </div>
      </div>
    </div>
  );
}
