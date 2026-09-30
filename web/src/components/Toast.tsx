import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warn' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastCtx {
  toast: (type: ToastType, message: string) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  warn: (msg: string) => void;
  info: (msg: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const COLORS: Record<ToastType, { color: string; bg: string; border: string; icon: string }> = {
  success: { color: '#06d6a0', bg: '#0a1f18', border: 'rgba(6,214,160,0.25)', icon: '✓' },
  error: { color: '#ef4444', bg: '#1a0f0f', border: 'rgba(239,68,68,0.25)', icon: '✕' },
  warn: { color: '#f59e0b', bg: '#1a140a', border: 'rgba(245,158,11,0.25)', icon: '⚠' },
  info: { color: '#3b82f6', bg: '#0a1020', border: 'rgba(59,130,246,0.25)', icon: 'ℹ' },
};

let _next = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const add = useCallback(
    (type: ToastType, message: string) => {
      const id = ++_next;
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const ctx = useMemo<ToastCtx>(
    () => ({
      toast: add,
      success: (msg) => add('success', msg),
      error: (msg) => add('error', msg),
      warn: (msg) => add('warn', msg),
      info: (msg) => add('info', msg),
    }),
    [add],
  );

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {/* Portal-style fixed container */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const s = COLORS[t.type];
          return (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 6,
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                pointerEvents: 'all',
                cursor: 'pointer',
                minWidth: 260,
                maxWidth: 380,
                animation: 'slideIn 0.18s ease',
              }}
              onClick={() => dismiss(t.id)}
            >
              <span style={{ fontSize: 12, color: s.color, marginTop: 1, flexShrink: 0 }}>
                {s.icon}
              </span>
              <span style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.4 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
