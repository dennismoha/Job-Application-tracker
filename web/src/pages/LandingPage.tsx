const stats = [
  { label: 'Applications tracked', value: '1.2k+' },
  { label: 'Interviews booked', value: '240' },
  { label: 'Response rate', value: '38%' },
];

const features = [
  {
    title: 'Track every step',
    description:
      'Log job postings, follow-up reminders, interview rounds, and final outcomes in one place.',
    icon: '✓',
  },
  {
    title: 'Stay organized',
    description:
      'See your pipeline at a glance with statuses, deadlines, and notes from every opportunity.',
    icon: '▣',
  },
  {
    title: 'Move faster',
    description:
      'Never miss a follow-up again with smart reminders, tags, and a clean application timeline.',
    icon: '⚡',
  },
];

const workflow = [
  'Add new roles and company details',
  'Track status changes and interview stages',
  'Set reminders for follow-ups',
  'Review insights to improve your search',
];

export default function LandingPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <>
      <style>{`
        .landing-page,
        .landing-page * { box-sizing: border-box; }

        .landing-page {
          font-family: Inter, 'Segoe UI', sans-serif;
          background: #f4f7fb;
          color: #162033;
        }

        .landing-page a {
          text-decoration: none;
        }

        .landing-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(88, 166, 255, 0.18), transparent 30%),
            linear-gradient(180deg, #f9fbff 0%, #edf4ff 100%);
          color: #162033;
        }

        .container {
          width: min(1200px, calc(100% - 32px));
          margin: 0 auto;
        }

        .hero {
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: 44px;
          padding: 48px 0 40px;
          align-items: center;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(37, 99, 235, 0.15);
          background: rgba(255, 255, 255, 0.7);
          color: #1d4ed8;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        h1 {
          margin: 18px 0 16px;
          font-size: clamp(2.8rem, 5vw, 4.5rem);
          line-height: 1.02;
          letter-spacing: -0.06em;
          color: #0f172a;
        }

        .highlight {
          color: #2563eb;
        }

        .subtitle {
          margin: 0;
          max-width: 620px;
          font-size: 1.08rem;
          line-height: 1.7;
          color: #475569;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 28px;
        }

        .primary-btn,
        .secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          padding: 0 22px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 0.98rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .primary-btn {
          background: linear-gradient(135deg, #2563eb, #2563eb);
          color: white;
          box-shadow: 0 16px 35px rgba(37, 99, 235, 0.25);
        }

        .secondary-btn {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(15, 23, 42, 0.08);
          color: #0f172a;
        }

        .primary-btn:hover,
        .secondary-btn:hover {
          transform: translateY(-1px);
        }

        .hero-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 22px;
          color: #475569;
          font-size: 0.95rem;
        }

        .hero-meta .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .badge-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 5px rgba(34, 197, 94, 0.16);
        }

        .dashboard-card {
          position: relative;
          width: 100%;
          max-width: 560px;
          margin-left: auto;
          padding: 22px;
          border-radius: 28px;
          background: rgba(15, 23, 42, 0.95);
          box-shadow: 0 30px 60px rgba(15, 23, 42, 0.18);
          overflow: hidden;
        }

        .dashboard-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), transparent 42%, rgba(168, 85, 247, 0.1));
          pointer-events: none;
        }

        .window-bar {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          z-index: 1;
        }

        .window-dot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
        }

        .window-dot:nth-child(1) { background: #f87171; }
        .window-dot:nth-child(2) { background: #fbbf24; }
        .window-dot:nth-child(3) { background: #4ade80; }

        .dashboard-body {
          position: relative;
          z-index: 1;
          background: rgba(15, 23, 42, 0.75);
          border-radius: 20px;
          padding: 20px;
          border: 1px solid rgba(148, 163, 184, 0.22);
        }

        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .dashboard-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #e2e8f0;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.12);
          color: #86efac;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .sample-list {
          display: grid;
          gap: 12px;
        }

        .sample-row {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr 0.7fr;
          gap: 14px;
          align-items: center;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(148, 163, 184, 0.08);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }

        .company {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #f8fafc;
          font-weight: 600;
        }

        .company-badge {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 0.75rem;
          font-weight: 800;
          color: #0f172a;
          background: linear-gradient(135deg, #bfdbfe, #c4b5fd);
        }

        .role {
          color: #cbd5e1;
          font-size: 0.82rem;
        }

        .stage {
          justify-self: end;
          padding: 7px 10px;
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(96, 165, 250, 0.3);
          color: #bfdbfe;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 700;
        }

        .metric-bar {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .metric-card {
          padding: 14px 12px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.16);
        }

        .metric-value {
          font-size: 1.45rem;
          font-weight: 800;
          color: #f8fafc;
          margin-bottom: 4px;
        }

        .metric-label {
          font-size: 0.75rem;
          color: #cbd5e1;
        }

        .section {
          padding: 40px 0 32px;
        }

        .section-header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .section-header h2 {
          margin: 0;
          font-size: clamp(1.8rem, 3vw, 2.6rem);
          letter-spacing: -0.04em;
          color: #0f172a;
        }

        .section-tag {
          color: #1d4ed8;
          font-weight: 700;
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-top: 22px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 22px;
          padding: 28px 20px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
        }

        .stat-number {
          font-size: clamp(2rem, 4vw, 2.7rem);
          font-weight: 800;
          letter-spacing: -0.06em;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .stat-label {
          color: #475569;
          font-weight: 600;
        }

        .features {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-top: 26px;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 22px;
          padding: 24px 20px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        }

        .feature-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          margin-bottom: 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, #dbeafe, #ede9fe);
          color: #1d4ed8;
          font-size: 1.3rem;
          font-weight: 800;
        }

        .feature-card h3 {
          margin: 0 0 8px;
          font-size: 1.2rem;
          color: #0f172a;
        }

        .feature-card p {
          margin: 0;
          color: #475569;
          line-height: 1.7;
        }

        .workflow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 26px;
          align-items: center;
          padding: 38px 0 26px;
        }

        .workflow-panel {
          background: rgba(15, 23, 42, 0.96);
          color: white;
          border-radius: 26px;
          padding: 26px;
          box-shadow: 0 28px 60px rgba(15, 23, 42, 0.14);
        }

        .workflow-panel h3 {
          margin: 0 0 16px;
          font-size: 1.7rem;
          letter-spacing: -0.04em;
        }

        .workflow-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 14px;
        }

        .workflow-list li {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #e2e8f0;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.15);
          background: rgba(148, 163, 184, 0.05);
        }

        .check {
          width: 22px;
          height: 22px;
          display: inline-grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.15);
          color: #86efac;
          font-weight: 900;
        }

        .insight-card {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 26px;
          padding: 26px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
        }

        .mini-chart {
          margin-top: 16px;
          padding: 12px 0 4px;
        }

        .bars {
          display: flex;
          align-items: end;
          gap: 14px;
          height: 150px;
          padding: 20px 12px 8px;
          border-radius: 18px;
          background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
        }

        .bar {
          flex: 1;
          border-radius: 12px 12px 0 0;
          background: linear-gradient(180deg, #60a5fa, #2563eb);
          min-height: 30px;
          position: relative;
        }

        .bar:nth-child(2) { background: linear-gradient(180deg, #a78bfa, #7c3aed); }
        .bar:nth-child(3) { background: linear-gradient(180deg, #34d399, #10b981); }
        .bar:nth-child(4) { background: linear-gradient(180deg, #fbbf24, #f59e0b); }

        .cta {
          padding: 54px 0 80px;
        }

        .cta-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 34px 32px;
          border-radius: 30px;
          background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
          box-shadow: 0 28px 60px rgba(29, 78, 216, 0.24);
        }

        .cta-box h3 {
          margin: 0 0 8px;
          color: white;
          font-size: clamp(1.8rem, 3vw, 2.7rem);
          letter-spacing: -0.05em;
        }

        .cta-box p {
          margin: 0;
          color: rgba(255, 255, 255, 0.8);
          font-size: 1.02rem;
        }

        .cta-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .cta .primary-btn {
          background: white;
          color: #0f172a;
          box-shadow: none;
        }

        .cta .secondary-btn {
          background: transparent;
          color: white;
          border-color: rgba(255, 255, 255, 0.22);
        }

        @media (max-width: 980px) {
          .hero,
          .workflow,
          .features,
          .stats {
            grid-template-columns: 1fr;
          }

          .dashboard-card {
            margin: 0 auto;
          }

          .cta-box {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 560px) {
          .hero {
            padding-top: 24px;
          }

          .hero-actions,
          .cta-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .primary-btn,
          .secondary-btn {
            width: 100%;
          }

          .sample-row {
            grid-template-columns: 1fr;
          }

          .metric-bar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="landing-page">
        <div className="container">
          <main>
            <section className="hero" id="start">
              <div>
                <div className="eyebrow">Smart job search starts here</div>
                <h1>
                  Turn your <span className="highlight">job hunt</span> into a tracked process.
                </h1>
                <p className="subtitle">
                  JobPilot helps you organize every application, manage follow-ups, and keep your job
                  search moving with clarity and momentum.
                </p>

                <div className="hero-actions">
                  <a
                    className="primary-btn"
                    href="/register"
                    onClick={(event) => {
                      event.preventDefault();
                      onNavigate('/register');
                    }}
                  >
                    Start tracking
                  </a>
                  <a className="secondary-btn" href="#features">See features</a>
                </div>

                <div className="hero-meta">
                  <span className="badge">
                    <span className="badge-dot" />
                    Used by active job seekers
                  </span>
                  <span>Free setup • No credit card</span>
                </div>
              </div>

              <div className="dashboard-card" aria-label="Application dashboard preview">
                <div className="window-bar">
                  <span className="window-dot" />
                  <span className="window-dot" />
                  <span className="window-dot" />
                </div>

                <div className="dashboard-body">
                  <div className="dashboard-header">
                    <div className="dashboard-title">Application pipeline</div>
                    <div className="status-pill">● Active search</div>
                  </div>

                  <div className="sample-list">
                    <div className="sample-row">
                      <div className="company">
                        <div className="company-badge">N</div>
                        <div>
                          Northstar Labs
                          <div className="role">Senior Product Designer</div>
                        </div>
                      </div>
                      <span className="stage">Interview</span>
                      <span className="role">May 18</span>
                    </div>

                    <div className="sample-row">
                      <div className="company">
                        <div className="company-badge">P</div>
                        <div>
                          PixelWorks
                          <div className="role">Frontend Engineer</div>
                        </div>
                      </div>
                      <span className="stage">Applied</span>
                      <span className="role">May 20</span>
                    </div>

                    <div className="sample-row">
                      <div className="company">
                        <div className="company-badge">A</div>
                        <div>
                          Aster Group
                          <div className="role">UX Research Lead</div>
                        </div>
                      </div>
                      <span className="stage">Follow-up</span>
                      <span className="role">May 24</span>
                    </div>
                  </div>

                  <div className="metric-bar">
                    <div className="metric-card">
                      <div className="metric-value">14</div>
                      <div className="metric-label">Open roles</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">3</div>
                      <div className="metric-label">Interviews</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">6</div>
                      <div className="metric-label">Follow-ups</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="section" id="results">
              <div className="section-header">
                <div>
                  <div className="section-tag">Impact</div>
                  <h2>Stay focused, organized, and ready.</h2>
                </div>
              </div>

              <div className="stats">
                {stats.map((stat) => (
                  <div className="stat-card" key={stat.label}>
                    <div className="stat-number">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="section" id="features">
              <div className="section-header">
                <div>
                  <div className="section-tag">Features</div>
                  <h2>Everything you need in one job-search hub.</h2>
                </div>
              </div>

              <div className="features">
                {features.map((feature) => (
                  <div className="feature-card" key={feature.title}>
                    <div className="feature-icon" aria-hidden="true">
                      {feature.icon}
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="workflow" id="workflow">
              <div className="workflow-panel">
                <h3>How it works</h3>
                <ul className="workflow-list">
                  {workflow.map((step) => (
                    <li key={step}>
                      <span className="check">✓</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="insight-card">
                <div className="section-tag">Insights</div>
                <h3 style={{ margin: '12px 0 0', fontSize: '2rem', letterSpacing: '-0.05em' }}>
                  Your search performance, in view.
                </h3>

                <div className="mini-chart" aria-label="Search activity graph">
                  <div className="bars">
                    <div className="bar" style={{ height: '48%' }} />
                    <div className="bar" style={{ height: '65%' }} />
                    <div className="bar" style={{ height: '82%' }} />
                    <div className="bar" style={{ height: '94%' }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="cta" id="pricing">
              <div className="cta-box">
                <div>
                  <h3>Build momentum with every application.</h3>
                  <p>Keep track, stay proactive, and make better decisions in your next job search.</p>
                </div>

                <div className="cta-actions">
                  <a
                    className="primary-btn"
                    href="/register"
                    onClick={(event) => {
                      event.preventDefault();
                      onNavigate('/register');
                    }}
                  >
                    Get started
                  </a>
                  <a className="secondary-btn" href="#features">Explore more</a>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
