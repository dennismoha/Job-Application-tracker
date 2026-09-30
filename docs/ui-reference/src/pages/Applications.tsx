import { useState } from 'react'
import { ConfirmDialog } from '../components/UI'
import { useToast } from '../components/Toast'

interface Application {
  id: number; title: string; company: string
  status: 'Considering' | 'Applied' | 'Assessment' | 'Interviewing' | 'Offer' | 'Rejected' | 'Withdrawn'
  applied: string; source: string; cv: string; salary?: string
  history: { status: string; date: string; note?: string }[]
  nextStep?: string
}

const INITIAL: Application[] = [
  {
    id: 1, title: 'Senior Backend Engineer', company: 'Stripe', status: 'Interviewing',
    applied: 'Sep 20, 2026', source: 'LinkedIn', cv: 'Backend Engineering CV v4', salary: '$180k–$240k',
    history: [
      { status: 'Applied', date: 'Sep 20' },
      { status: 'Assessment', date: 'Sep 22', note: 'Technical coding challenge sent' },
      { status: 'Interviewing', date: 'Sep 24', note: 'Passed assessment. Initial screen with recruiter.' },
    ],
    nextStep: 'Technical interview — Oct 1, 2026',
  },
  {
    id: 2, title: 'Staff Software Engineer', company: 'Vercel', status: 'Applied',
    applied: 'Sep 23, 2026', source: 'Wellfound', cv: 'Backend Engineering CV v4', salary: '$200k–$280k',
    history: [{ status: 'Applied', date: 'Sep 23' }],
    nextStep: 'Waiting for response',
  },
  {
    id: 3, title: 'Platform Engineer', company: 'Cloudflare', status: 'Assessment',
    applied: 'Sep 18, 2026', source: 'Chrome Extension', cv: 'Backend Engineering CV v4', salary: '$160k–$220k',
    history: [
      { status: 'Applied', date: 'Sep 18' },
      { status: 'Assessment', date: 'Sep 22', note: 'Systems design take-home' },
    ],
    nextStep: 'Submit assessment by Sep 30',
  },
  {
    id: 4, title: 'Senior Backend Engineer', company: 'Notion', status: 'Rejected',
    applied: 'Sep 10, 2026', source: 'LinkedIn', cv: 'Backend Engineering CV v3', salary: '$175k–$235k',
    history: [
      { status: 'Applied', date: 'Sep 10' },
      { status: 'Interviewing', date: 'Sep 14' },
      { status: 'Rejected', date: 'Sep 20', note: 'After technical round. Looking for deeper distributed systems exp.' },
    ],
  },
  {
    id: 5, title: 'Principal Engineer', company: 'Linear', status: 'Offer',
    applied: 'Sep 5, 2026', source: 'Wellfound', cv: 'Backend Engineering CV v4', salary: '$220k–$300k',
    history: [
      { status: 'Applied', date: 'Sep 5' },
      { status: 'Interviewing', date: 'Sep 9' },
      { status: 'Assessment', date: 'Sep 13' },
      { status: 'Interviewing', date: 'Sep 17', note: 'Final round' },
      { status: 'Offer', date: 'Sep 23', note: 'Offer: $265k base + equity. Respond by Oct 2.' },
    ],
    nextStep: 'Respond by Oct 2, 2026',
  },
  {
    id: 6, title: 'Backend Engineer', company: 'Brex', status: 'Considering',
    applied: 'Sep 25, 2026', source: 'Universal Search', cv: 'Backend Engineering CV v4', salary: '$160k–$210k',
    history: [{ status: 'Considering', date: 'Sep 25' }],
  },
]

const STATUS_ORDER: Application['status'][] = ['Considering','Applied','Assessment','Interviewing','Offer','Rejected']
const STATUS_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  Considering:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
  Applied:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)' },
  Assessment:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
  Interviewing: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.2)' },
  Offer:        { color: '#06d6a0', bg: 'rgba(6,214,160,0.1)',   border: 'rgba(6,214,160,0.2)' },
  Rejected:     { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)' },
  Withdrawn:    { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)' },
}

function StatusBadge({ status }: { status: Application['status'] }) {
  const s = STATUS_COLORS[status]
  return <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: `1px solid ${s.border}`, color: s.color, background: s.bg, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{status}</span>
}

const PIPELINE_STAGES = ['Applied', 'Assessment', 'Interviewing', 'Offer']

function PipelineBar({ status }: { status: string }) {
  const idx = PIPELINE_STAGES.indexOf(status)
  const failed = status === 'Rejected' || status === 'Withdrawn'
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {PIPELINE_STAGES.map((s, i) => {
        const active = !failed && i <= idx; const curr = !failed && i === idx
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ flex: 1, height: 2, background: active && !curr ? '#06d6a0' : '#1a2540' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: curr ? '#3b82f6' : active ? '#06d6a0' : '#1a2540', border: `2px solid ${curr ? '#3b82f6' : active ? '#06d6a0' : '#243050'}`, flexShrink: 0 }} />
            <div style={{ flex: 1, height: 2, background: active && i < idx ? '#06d6a0' : '#1a2540' }} />
          </div>
        )
      })}
    </div>
  )
}

/* ── Kanban column ── */
function KanbanColumn({ col, apps, onMove, onClick }: { col: Application['status']; apps: Application[]; onMove: (id: number, s: Application['status']) => void; onClick: (a: Application) => void }) {
  const sc = STATUS_COLORS[col]
  const [dragOver, setDragOver] = useState(false)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); const id = parseInt(e.dataTransfer.getData('id')); onMove(id, col) }}
      style={{ flex: 1, minWidth: 200, background: dragOver ? 'rgba(59,130,246,0.04)' : '#080d1c', border: `1px solid ${dragOver ? '#3b82f6' : '#1a2540'}`, borderRadius: 6, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'border-color 0.15s' }}
    >
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1a2540', display: 'flex', alignItems: 'center', gap: 8, background: '#0a1020' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }}>{col}</span>
        <span style={{ fontSize: 10, color: '#334155', marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>{apps.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {apps.map(a => (
          <div
            key={a.id}
            draggable
            onDragStart={e => e.dataTransfer.setData('id', String(a.id))}
            onClick={() => onClick(a)}
            style={{ background: '#0d1425', border: '1px solid #1a2540', borderRadius: 5, padding: '10px 12px', cursor: 'grab', userSelect: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#243050')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a2540')}
          >
            <div style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0', marginBottom: 2, lineHeight: 1.3 }}>{a.title}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: a.nextStep ? 6 : 0 }}>{a.company}</div>
            {a.nextStep && <div style={{ fontSize: 10, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>→ {a.nextStep.length > 32 ? a.nextStep.slice(0,32)+'…' : a.nextStep}</div>}
          </div>
        ))}
        {apps.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#334155', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>Drop here</div>
        )}
      </div>
    </div>
  )
}

/* ── Detail side panel ── */
function DetailPanel({ app, onClose, onStatusChange }: { app: Application; onClose: () => void; onStatusChange: (id: number, s: Application['status']) => void }) {
  const [note, setNote] = useState('')
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)

  return (
    <>
      <ConfirmDialog
        open={confirm} danger title="Delete Application"
        message={<>Are you sure you want to delete the application for <strong>{app.title}</strong> at <strong>{app.company}</strong>? This cannot be undone.</>}
        confirmLabel="Delete" onConfirm={() => { setConfirm(false); onClose(); toast.success('Application deleted.') }} onCancel={() => setConfirm(false)}
      />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 100 }}>
        <div style={{ width: 500, height: '100%', background: '#0d1425', borderLeft: '1px solid #1a2540', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #1a2540' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{app.title}</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>{app.company}{app.salary && <span style={{ color: '#64748b', marginLeft: 8 }}>{app.salary}</span>}</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <StatusBadge status={app.status} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
            {/* Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Applied',  val: app.applied },
                { label: 'Source',   val: app.source },
                { label: 'CV',       val: app.cv },
                { label: 'Status',   val: app.status },
              ].map(m => (
                <div key={m.label} style={{ background: '#111c35', borderRadius: 4, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{m.val}</div>
                </div>
              ))}
            </div>

            {/* Next step */}
            {app.nextStep && (
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 5, padding: '10px 12px', marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>NEXT STEP</div>
                <div style={{ fontSize: 13, color: '#93c5fd' }}>{app.nextStep}</div>
              </div>
            )}

            {/* Status update */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Update Status</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {(Object.keys(STATUS_COLORS) as Application['status'][]).map(s => (
                  <button key={s} onClick={() => { onStatusChange(app.id, s); toast.success(`Status updated to ${s}.`) }}
                    style={{ padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', background: app.status === s ? STATUS_COLORS[s].bg : 'none', border: `1px solid ${app.status === s ? STATUS_COLORS[s].border : '#1a2540'}`, color: app.status === s ? STATUS_COLORS[s].color : '#64748b' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* History */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>History</div>
              {app.history.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: i < app.history.length - 1 ? 12 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === app.history.length - 1 ? '#3b82f6' : '#243050', border: '2px solid', borderColor: i === app.history.length - 1 ? '#3b82f6' : '#1a2540', flexShrink: 0, marginTop: 2 }} />
                    {i < app.history.length - 1 && <div style={{ width: 1, flex: 1, background: '#1a2540', marginTop: 4 }} />}
                  </div>
                  <div style={{ paddingBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: h.note ? 3 : 0 }}>
                      <StatusBadge status={h.status as Application['status']} />
                      <span style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{h.date}</span>
                    </div>
                    {h.note && <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{h.note}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Note */}
            <div>
              <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Add Note</div>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Notes about this application..."
                style={{ width: '100%', padding: '8px 10px', background: '#111c35', border: '1px solid #1a2540', borderRadius: 5, color: '#e2e8f0', fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
              <button onClick={() => { setNote(''); toast.success('Note saved.') }} style={{ marginTop: 6, padding: '5px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 4, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>Save Note</button>
            </div>
          </div>

          <div style={{ padding: '12px 22px', borderTop: '1px solid #1a2540', display: 'flex', gap: 8 }}>
            <button style={{ flex: 1, padding: '8px 0', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 5, color: '#3b82f6', fontSize: 12, cursor: 'pointer' }}>Open Job</button>
            <button onClick={() => setConfirm(true)} style={{ padding: '8px 14px', background: 'none', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>Delete</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Applications({ filter }: { filter: string }) {
  const [apps, setApps] = useState(INITIAL)
  const [selected, setSelected] = useState<Application | null>(null)
  const [view, setView] = useState<'list' | 'kanban'>('list')

  function moveStatus(id: number, status: Application['status']) {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status, history: [...a.history, { status, date: 'Sep 25' }] } : a))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null)
  }

  const filtered = apps.filter(a => {
    if (filter === 'apps-applied')      return a.status === 'Applied'
    if (filter === 'apps-interviewing') return a.status === 'Interviewing' || a.status === 'Assessment'
    if (filter === 'apps-rejected')     return a.status === 'Rejected' || a.status === 'Withdrawn'
    if (filter === 'apps-offers')       return a.status === 'Offer'
    return true
  })

  const title = filter === 'apps-applied' ? 'Applied' : filter === 'apps-interviewing' ? 'In Progress' : filter === 'apps-rejected' ? 'Rejected' : filter === 'apps-offers' ? 'Offers' : 'All Applications'

  return (
    <div className="page-pad">
      {selected && <DetailPanel app={selected} onClose={() => setSelected(null)} onStatusChange={(id, s) => moveStatus(id, s)} />}

      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em' }}>{title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
            {filtered.length} applications · {apps.filter(a => a.status === 'Interviewing' || a.status === 'Assessment').length} in progress · {apps.filter(a => a.status === 'Offer').length} offers
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['list', 'kanban'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '7px 14px', background: view === v ? 'rgba(59,130,246,0.15)' : 'none', border: `1px solid ${view === v ? '#3b82f6' : '#1a2540'}`, borderRadius: 5, color: view === v ? '#3b82f6' : '#64748b', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>
              {v === 'list' ? '☰ List' : '⊞ Kanban'}
            </button>
          ))}
        </div>
      </div>

      {/* Funnel stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Applied',      count: apps.length,                                              color: '#3b82f6' },
          { label: 'Assessment',   count: apps.filter(a => a.status === 'Assessment').length,        color: '#f59e0b' },
          { label: 'Interviewing', count: apps.filter(a => a.status === 'Interviewing').length,      color: '#8b5cf6' },
          { label: 'Offer',        count: apps.filter(a => a.status === 'Offer').length,             color: '#06d6a0' },
          { label: 'Rejected',     count: apps.filter(a => a.status === 'Rejected').length,          color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="data-card" style={{ borderRadius: 6, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* ── Kanban ── */}
      {view === 'kanban' && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
          {STATUS_ORDER.map(col => (
            <KanbanColumn
              key={col} col={col}
              apps={filtered.filter(a => a.status === col)}
              onMove={moveStatus}
              onClick={a => setSelected(a)}
            />
          ))}
        </div>
      )}

      {/* ── List ── */}
      {view === 'list' && (
        <div className="data-card table-wrap" style={{ borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
                {['Position', 'Company', 'Status', 'Pipeline', 'Applied', 'Source', 'CV', 'Next Step'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} className="tr-hover" style={{ borderBottom: i < filtered.length - 1 ? '1px solid #1a2540' : 'none', cursor: 'pointer', background: selected?.id === a.id ? 'rgba(59,130,246,0.04)' : 'transparent' }} onClick={() => setSelected(selected?.id === a.id ? null : a)}>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{a.title}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#94a3b8' }}>{a.company}</td>
                  <td style={{ padding: '11px 16px' }}><StatusBadge status={a.status} /></td>
                  <td style={{ padding: '11px 24px 11px 16px', minWidth: 160 }}><PipelineBar status={a.status} /></td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{a.applied}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: a.source === 'Chrome Extension' ? '#8b5cf6' : '#64748b' }}>{a.source === 'Chrome Extension' ? '⊕ Extension' : a.source}</td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: '#475569' }}>{a.cv}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: a.nextStep ? '#f59e0b' : '#334155' }}>{a.nextStep ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
