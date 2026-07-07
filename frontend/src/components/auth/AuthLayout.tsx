import React, { useEffect, useRef } from 'react';
import { Shield, Sparkles, Scale, Brain, Lock } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const features = [
  { icon: Brain, label: 'AI-Powered Analysis', desc: 'NLP-driven incident processing in real time' },
  { icon: Scale, label: 'BNS Legal Framework', desc: 'Bharatiya Nyaya Sanhita compliant FIR generation' },
  { icon: Shield, label: 'Enterprise Security', desc: 'JWT auth with bcrypt & zero-knowledge design' },
  { icon: Lock, label: 'End-to-End Privacy', desc: 'Your legal data never leaves encrypted storage' },
];

function AnimatedBackground() {
  return (
    <div className="brand-bg-wrapper" aria-hidden="true">
      {/* Grid lines */}
      <div className="brand-grid" />
      {/* Glowing orbs */}
      <div className="brand-orb brand-orb-a" />
      <div className="brand-orb brand-orb-b" />
      <div className="brand-orb brand-orb-c" />
      {/* Noise overlay */}
      <div className="brand-noise" />
    </div>
  );
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const particleRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = particleRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      radius: number; opacity: number; pulse: number;
    }> = [];

    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let animId: number;
    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;
        const op = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));
        if (p.x < 0) p.x = canvas!.width;
        if (p.x > canvas!.width) p.x = 0;
        if (p.y < 0) p.y = canvas!.height;
        if (p.y > canvas!.height) p.y = 0;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(16, 163, 127, ${op})`;
        ctx!.fill();
      });
      animId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="al-root">
      {/* ── Left brand panel ─────────────────────────────── */}
      <aside className="al-brand">
        <AnimatedBackground />
        <canvas ref={particleRef} className="al-canvas" aria-hidden="true" />

        <div className="al-brand-inner">
          {/* Logo */}
          <div className="al-logo">
            <div className="al-logo-icon">
              <Shield size={22} strokeWidth={2.2} />
            </div>
            <div>
              <span className="al-logo-name">NESYA</span>
              <span className="al-logo-tag">AI Legal Platform</span>
            </div>
          </div>

          {/* Hero text */}
          <div className="al-hero">
            <h2 className="al-hero-title">
              File FIRs with the
              <span className="al-hero-accent"> intelligence</span>
              <br />of AI
            </h2>
            <p className="al-hero-desc">
              The most advanced AI-powered First Information Report system,
              built on the Bharatiya Nyaya Sanhita legal framework.
            </p>
          </div>

          {/* Feature grid */}
          <ul className="al-features">
            {features.map(({ icon: Icon, label, desc }) => (
              <li key={label} className="al-feature">
                <div className="al-feature-icon">
                  <Icon size={15} strokeWidth={2} />
                </div>
                <div className="al-feature-text">
                  <span className="al-feature-label">{label}</span>
                  <span className="al-feature-desc">{desc}</span>
                </div>
              </li>
            ))}
          </ul>

          {/* Stats */}
          <div className="al-stats">
            {[
              { num: '500+', tag: 'BNS Sections' },
              { num: '98%', tag: 'Accuracy' },
              { num: '<3min', tag: 'FIR Time' },
            ].map(({ num, tag }) => (
              <div key={tag} className="al-stat">
                <span className="al-stat-num">{num}</span>
                <span className="al-stat-tag">{tag}</span>
              </div>
            ))}
          </div>

          {/* Sparkle badge */}
          <div className="al-badge">
            <Sparkles size={12} />
            <span>Powered by advanced NLP & BNS Rule Engine</span>
          </div>
        </div>
      </aside>

      {/* ── Right form panel ──────────────────────────────── */}
      <main className="al-form-panel">
        <div className="al-form-scroll">
          <div className="al-card">
            {/* Mobile logo */}
            <div className="al-mobile-logo">
              <div className="al-logo-icon al-logo-icon--sm">
                <Shield size={18} strokeWidth={2.2} />
              </div>
              <span className="al-logo-name al-logo-name--sm">NESYA</span>
            </div>

            {(title || subtitle) && (
              <div className="al-card-header">
                {title && <h1 className="al-card-title">{title}</h1>}
                {subtitle && <p className="al-card-subtitle">{subtitle}</p>}
              </div>
            )}

            {children}
          </div>

          <p className="al-terms">
            By continuing, you agree to our{' '}
            <a href="#" className="al-terms-link">Terms</a>
            {' '}and{' '}
            <a href="#" className="al-terms-link">Privacy Policy</a>
          </p>
        </div>
      </main>
    </div>
  );
}
