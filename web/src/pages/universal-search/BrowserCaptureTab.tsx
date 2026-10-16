import type { Page } from '../../types/navigation';

/** Explains the browser extension workflow and links to its setup page. */
export function BrowserCaptureTab({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.3fr) minmax(280px,.7fr)',
        gap: 18,
      }}
    >
      <div className="data-card" style={{ borderRadius: 6, padding: 22 }}>
        <div className="mono" style={{ fontSize: 9, color: '#8b5cf6', marginBottom: 8 }}>
          BROWSER COMPANION
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 16, color: '#e2e8f0' }}>
          Already looking at a job?
        </h2>
        <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.6, maxWidth: 620 }}>
          The extension can inspect the open page, detect whether it is a vacancy, extract the role,
          compare it with one of your CVs, save the job, mark it applied, or send you into CV tailoring
          without copying anything manually.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
            gap: 8,
            margin: '18px 0',
          }}
        >
          {['Detect job page', 'Extract requirements', 'Compare CV', 'Save / Apply / Tailor'].map(
            (step, index) => (
              <div
                key={step}
                style={{
                  padding: 10,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                }}
              >
                <span className="mono" style={{ color: '#8b5cf6', fontSize: 9 }}>
                  0{index + 1}
                </span>
                <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 5 }}>{step}</div>
              </div>
            ),
          )}
        </div>
        <button
          onClick={() => onNavigate('extension')}
          style={{
            padding: '8px 12px',
            background: '#3b82f6',
            border: 0,
            borderRadius: 4,
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Open Extension setup →
        </button>
      </div>
      <div className="data-card" style={{ borderRadius: 6, padding: 18 }}>
        <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 10 }}>
          WHY THIS EXISTS
        </div>
        <p style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.55, marginTop: 0 }}>
          Not every useful job will be found by a crawler or alert. Browser capture closes that gap
          while keeping the same canonical job, deduplication and application-tracking logic.
        </p>
        <div
          style={{
            borderTop: '1px solid #1a2540',
            marginTop: 14,
            paddingTop: 12,
            color: '#64748b',
            fontSize: 10,
            lineHeight: 1.5,
          }}
        >
          The extension never needs to become another job database. It is just one more acquisition
          channel into this workspace.
        </div>
      </div>
    </div>
  );
}
