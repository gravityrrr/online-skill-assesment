import { ArrowRight, GraduationCap, Shield, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="shell">
      <div className="orb orb-left" />
      <div className="orb orb-right" />

      <header className="hero animate-rise" style={{ maxWidth: 760 }}>
        <p className="eyebrow">Skill assessment platform</p>
        <h1 className="title">Choose your portal</h1>
        <p className="subtitle">
          A focused workspace for learners, instructors, and administrators to run secure assessment workflows.
        </p>
      </header>

      <div className="landing-grid animate-rise" style={{ animationDelay: '0.08s' }}>
        <article className="panel portal-card" onClick={() => navigate('/login/learner')}>
          <UserCircle2 size={54} className="portal-icon" />
          <h2 className="portal-title">Learner portal</h2>
          <p className="portal-desc">Open assigned assessments, monitor progress, and review historical results.</p>
          <button className="primary-btn full-width" type="button">
            Continue as learner <ArrowRight size={18} />
          </button>
        </article>

        <article className="panel portal-card" onClick={() => navigate('/login/instructor')}>
          <GraduationCap size={54} className="portal-icon" />
          <h2 className="portal-title">Instructor portal</h2>
          <p className="portal-desc">Build assessments, manage courses, and track class performance signals.</p>
          <button className="primary-btn full-width" type="button">
            Continue as instructor <ArrowRight size={18} />
          </button>
        </article>
      </div>

      <button type="button" onClick={() => navigate('/login/admin')} className="text-btn admin-link animate-rise" style={{ animationDelay: '0.15s' }}>
        <Shield size={15} /> Admin sign-in
      </button>
    </div>
  );
}
