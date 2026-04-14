import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureProfile } from '../../lib/profile';
import { supabase } from '../../lib/supabase';
import { Database, Lock, Mail, Network, ShieldCheck, User } from 'lucide-react';

interface AuthProps {
  role: 'Learner' | 'Instructor' | 'Admin';
  type: 'Login' | 'Register';
}

export default function DynamicAuth({ role, type }: AuthProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isInstructor = role === 'Instructor';
  const isAdmin = role === 'Admin';
  const canUseGoogle = type === 'Login' || role === 'Learner';

  const contextLabel = isAdmin ? 'Admin' : isInstructor ? 'Instructor' : 'Learner';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (type === 'Register') {
      if (isAdmin) {
        setLoading(false);
        setError('Admin accounts cannot be self-registered. Use controlled provisioning.');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } },
      });
      if (error) {
        setError(error.message);
      } else if (isInstructor) {
        setSuccess('Registration complete. Your instructor account is waiting for admin approval.');
      } else if (data.session) {
        navigate('/learner-dashboard', { replace: true });
      } else {
        setSuccess('Registration complete. Please verify your email, then sign in.');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        // Validate that this account actually belongs to the portal they're logging into
        const { data: dbRow } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        const dbRole = dbRow?.role;

        if (dbRole && dbRole !== role) {
          // Role mismatch — sign out and show a clear error
          await supabase.auth.signOut();
          setError(`This account is registered as "${dbRole}". Please use the ${dbRole} portal to sign in.`);
          setLoading(false);
          return;
        }

        // Role matches (or no DB row yet — let App.tsx handle it via fallback)
        // App.tsx will pick up the session change and route accordingly.
        return;
      }
    }
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    if (type === 'Register' && role !== 'Learner') {
      setError('Google sign-up is enabled for learner accounts only.');
      return;
    }

    setOauthLoading(true);
    setError('');
    setSuccess('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setError(error.message);
      setOauthLoading(false);
    }
  };

  return (
    <div className="shell">
      <div className="orb orb-right" />

      <div className="panel auth-card animate-rise">
        <div className="auth-header">
          {isAdmin ? <Database size={48} className="portal-icon" /> : isInstructor ? <ShieldCheck size={48} className="portal-icon" /> : <Network size={48} className="portal-icon" />}
          <p className="eyebrow">{contextLabel} access</p>
          <h1 className="auth-title">{type === 'Login' ? 'Welcome back' : `Create ${contextLabel.toLowerCase()} account`}</h1>
          <p className="auth-subtitle">Use your registered email and password to continue securely.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {type === 'Register' && !isAdmin && (
            <div className="input-block">
              <User className="input-icon" size={18} />
              <input
                type="text"
                required
                className="input-premium"
                placeholder="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          )}

          <div className="input-block">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              required
              className="input-premium"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="input-block">
            <Lock className="input-icon" size={18} />
            <input
              type="password"
              required
              className="input-premium"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="primary-btn full-width">
            {loading ? 'Please wait...' : type === 'Login' ? `Sign in as ${contextLabel.toLowerCase()}` : 'Create account'}
          </button>

          {canUseGoogle && (
            <>
              <div className="auth-divider">or</div>
              <button type="button" disabled={oauthLoading} className="secondary-btn full-width" onClick={() => void handleGoogleAuth()}>
                {oauthLoading
                  ? 'Redirecting to Google...'
                  : type === 'Login'
                    ? 'Continue with Google'
                    : 'Sign up with Google'}
              </button>
            </>
          )}
        </form>

        <div className="login-footer">
          {!isAdmin && (
            <button
              type="button"
              onClick={() => navigate(type === 'Login' ? `/register/${role.toLowerCase()}` : `/login/${role.toLowerCase()}`)}
              className="text-btn"
            >
              {type === 'Login' ? 'Need an account? Register here' : 'Already registered? Sign in'}
            </button>
          )}

          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={() => navigate('/')} className="text-btn subtle">
              Return to portal selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
