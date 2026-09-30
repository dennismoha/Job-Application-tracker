import { ReactNode, useState, useEffect, useRef } from 'react';

/* ── Skeleton ── */
export function Skeleton({
  width,
  height,
  style,
}: {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: width ?? '100%',
        height: height ?? 14,
        background: 'linear-gradient(90deg, #111c35 25%, #1a2540 50%, #111c35 75%)',
        backgroundSize: '200% 100%',
        borderRadius: 4,
        animation: 'shimmer 1.4s infinite',
        ...style,
      }}
    />
  );
}
export function SkeletonRow() {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1a2540',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <Skeleton width={160} height={13} />
      <Skeleton width={100} height={13} />
      <Skeleton width={70} height={13} />
      <Skeleton width={90} height={13} />
      <Skeleton width={60} height={20} style={{ borderRadius: 3 }} />
    </div>
  );
}
export function SkeletonCard() {
  return (
    <div
      style={{
        background: '#0d1425',
        border: '1px solid #1a2540',
        borderRadius: 6,
        padding: '16px 20px',
      }}
    >
      <Skeleton width="60%" height={14} style={{ marginBottom: 10 }} />
      <Skeleton width="40%" height={11} style={{ marginBottom: 14 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width={50} height={20} style={{ borderRadius: 3 }} />
        <Skeleton width={60} height={20} style={{ borderRadius: 3 }} />
        <Skeleton width={45} height={20} style={{ borderRadius: 3 }} />
      </div>
    </div>
  );
}

/* ── Empty State ── */
export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon?: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
      }}
    >
      {icon && <div style={{ fontSize: 32, marginBottom: 14, opacity: 0.4 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>
        {title}
      </div>
      {desc && (
        <div
          style={{
            fontSize: 12,
            color: '#475569',
            marginBottom: 16,
            maxWidth: 320,
            lineHeight: 1.5,
          }}
        >
          {desc}
        </div>
      )}
      {action}
    </div>
  );
}

/* ── Confirm Dialog ── */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7,11,20,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
      }}
    >
      <div
        style={{
          background: '#0d1425',
          border: '1px solid #1a2540',
          borderRadius: 8,
          width: 400,
          padding: 28,
        }}
      >
        <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
          {title}
        </h3>
        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20 }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: '1px solid #1a2540',
              borderRadius: 5,
              color: '#64748b',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              background: danger ? '#ef4444' : '#3b82f6',
              border: 'none',
              borderRadius: 5,
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Tooltip ── */
export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1a2540',
            border: '1px solid #243050',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 11,
            color: '#cbd5e1',
            whiteSpace: 'nowrap',
            zIndex: 200,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

/* ── Pagination ── */
export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const visible: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) visible.push(i);
    else if (visible[visible.length - 1] !== '…') visible.push('…');
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '12px 16px',
        borderTop: '1px solid #1a2540',
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: '#475569',
          fontFamily: 'JetBrains Mono, monospace',
          marginRight: 8,
        }}
      >
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        style={{
          padding: '4px 10px',
          background: 'none',
          border: '1px solid #1a2540',
          borderRadius: 4,
          color: page === 1 ? '#334155' : '#64748b',
          fontSize: 12,
          cursor: page === 1 ? 'default' : 'pointer',
        }}
      >
        ‹
      </button>
      {visible.map((v, i) => (
        <button
          key={i}
          disabled={v === '…'}
          onClick={() => typeof v === 'number' && onChange(v)}
          style={{
            padding: '4px 10px',
            background: v === page ? 'rgba(59,130,246,0.15)' : 'none',
            border: `1px solid ${v === page ? '#3b82f6' : '#1a2540'}`,
            borderRadius: 4,
            color: v === page ? '#3b82f6' : '#64748b',
            fontSize: 12,
            cursor: typeof v === 'number' ? 'pointer' : 'default',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          {v}
        </button>
      ))}
      <button
        disabled={page === pages}
        onClick={() => onChange(page + 1)}
        style={{
          padding: '4px 10px',
          background: 'none',
          border: '1px solid #1a2540',
          borderRadius: 4,
          color: page === pages ? '#334155' : '#64748b',
          fontSize: 12,
          cursor: page === pages ? 'default' : 'pointer',
        }}
      >
        ›
      </button>
    </div>
  );
}

/* ── Tag input ── */
export function TagInput({
  tags,
  onChange,
  placeholder = 'Add tag...',
}: {
  tags: string[];
  onChange: (t: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const COLORS = ['#ef4444', '#f59e0b', '#06d6a0', '#3b82f6', '#8b5cf6', '#64748b'];
  function add() {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput('');
  }
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: '6px 8px',
        background: '#111c35',
        border: '1px solid #1a2540',
        borderRadius: 5,
      }}
    >
      {tags.map((t, i) => (
        <span
          key={t}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 3,
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.2)',
            color: '#93c5fd',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: COLORS[i % COLORS.length],
              display: 'inline-block',
            }}
          />
          {t}
          <span
            onClick={() => onChange(tags.filter((x) => x !== t))}
            style={{ cursor: 'pointer', opacity: 0.5, marginLeft: 2 }}
          >
            ✕
          </span>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        }}
        placeholder={placeholder}
        style={{
          border: 'none',
          background: 'none',
          outline: 'none',
          fontSize: 12,
          color: '#e2e8f0',
          minWidth: 80,
          flex: 1,
        }}
      />
    </div>
  );
}

/* ── Breadcrumbs ── */
export function Breadcrumbs({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: '#334155', fontSize: 11 }}>›</span>}
          <span
            onClick={item.onClick}
            style={{
              fontSize: 12,
              color: item.onClick ? '#3b82f6' : '#64748b',
              cursor: item.onClick ? 'pointer' : 'default',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {item.label}
          </span>
        </span>
      ))}
    </div>
  );
}

/* ── Global keyboard shortcut hook ── */
export function useKeydown(key: string, meta: boolean, cb: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (meta && !(e.metaKey || e.ctrlKey)) return;
      if (e.key === key) {
        e.preventDefault();
        cb();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, meta, cb]);
}

/* ── File Uploader ── */
export function FileUploader({
  accept,
  onFile,
  label = 'Drop file here or click to upload',
}: {
  accept?: string;
  onFile: (f: File) => void;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${drag ? '#3b82f6' : '#1a2540'}`,
        borderRadius: 6,
        padding: '32px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        background: drag ? 'rgba(59,130,246,0.05)' : 'transparent',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 10, opacity: 0.4 }}>↑</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#334155' }}>{accept?.replace(/,/g, ', ')}</div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}
