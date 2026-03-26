"use client"
 
import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react"
 
/* ─── types ──────────────────────────────────────────────────────────────── */
export type ToastType = "success" | "error" | "warning" | "info"
 
type ToastItem = {
  id: string
  message: string
  type: ToastType
  duration: number
  _leaving?: boolean
}
 
type ToastFn = (message: string, type?: ToastType, duration?: number) => void
 
const ToastContext = createContext<ToastFn | null>(null)
 
/* ─── provider ───────────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
 
  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, _leaving: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      const t = timers.current.get(id)
      if (t) { clearTimeout(t); timers.current.delete(id) }
    }, 300)
  }, [])
 
  const showToast = useCallback<ToastFn>((message, type = "success", duration = 3000) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts(prev => {
      const next = [...prev, { id, message, type, duration }]
      return next.length > 5 ? next.slice(-5) : next
    })
    const timer = setTimeout(() => dismiss(id), duration)
    timers.current.set(id, timer)
  }, [dismiss])
 
  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])
 
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Toaster toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}
 
/* ─── hook ───────────────────────────────────────────────────────────────── */
export function useToast() {
  const fn = useContext(ToastContext)
  if (!fn) throw new Error("useToast must be used inside <ToastProvider>")
  return fn
}
 
/* ─── config ─────────────────────────────────────────────────────────────── */
const CONFIG: Record<ToastType, {
  bg: string
  border: string
  iconBg: string
  iconColor: string
  bar: string
  icon: JSX.Element
}> = {
  success: {
    bg:        "rgba(10, 36, 22, 0.95)",
    border:    "rgba(52, 211, 153, 0.25)",
    iconBg:    "rgba(52, 211, 153, 0.15)",
    iconColor: "#34d399",
    bar:       "#34d399",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
  error: {
    bg:        "rgba(40, 10, 10, 0.95)",
    border:    "rgba(248, 113, 113, 0.25)",
    iconBg:    "rgba(248, 113, 113, 0.15)",
    iconColor: "#f87171",
    bar:       "#f87171",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
  },
  warning: {
    bg:        "rgba(38, 25, 5, 0.95)",
    border:    "rgba(251, 191, 36, 0.25)",
    iconBg:    "rgba(251, 191, 36, 0.15)",
    iconColor: "#fbbf24",
    bar:       "#fbbf24",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  info: {
    bg:        "rgba(8, 15, 40, 0.95)",
    border:    "rgba(99, 102, 241, 0.25)",
    iconBg:    "rgba(99, 102, 241, 0.15)",
    iconColor: "#a5b4fc",
    bar:       "#6366f1",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
}
 
/* ─── toaster ────────────────────────────────────────────────────────────── */
function Toaster({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: string) => void }) {
  if (!toasts.length) return null
 
  return (
    <>
      <div className="tst-wrap">
        {toasts.map(t => <ToastCard key={t.id} t={t} onDismiss={() => dismiss(t.id)} />)}
      </div>
 
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
 
        .tst-wrap {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 340px;
          max-width: calc(100vw - 32px);
          pointer-events: none;
          font-family: 'DM Sans', -apple-system, sans-serif;
        }
 
        .tst-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 13px 16px 13px;
          border-radius: 14px;
          border: 1px solid;
          overflow: hidden;
          pointer-events: all;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.2);
        }
 
        @keyframes tst-in {
          from { opacity: 0; transform: translateX(18px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)    scale(1);    }
        }
        @keyframes tst-out {
          from { opacity: 1; transform: translateX(0)    scale(1);    max-height: 120px; padding-top: 13px; padding-bottom: 16px; margin-bottom: 0; }
          to   { opacity: 0; transform: translateX(20px) scale(0.95); max-height: 0;     padding-top: 0;    padding-bottom: 0;   margin-bottom: -10px; }
        }
 
        .tst-card--in  { animation: tst-in  0.3s cubic-bezier(0.34, 1.15, 0.64, 1) both; }
        .tst-card--out { animation: tst-out 0.28s cubic-bezier(0.4, 0, 0.2, 1)      both; }
 
        .tst-icon-wrap {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
 
        .tst-msg {
          flex: 1;
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.45;
          color: rgba(255,255,255,0.90);
          min-width: 0;
        }
 
        .tst-close {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.28);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.13s, color 0.13s;
          padding: 0;
        }
        .tst-close:hover {
          background: rgba(255,255,255,0.11);
          color: rgba(255,255,255,0.7);
        }
 
        .tst-bar-track {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255,255,255,0.05);
        }
        .tst-bar {
          height: 100%;
          width: 100%;
          transform-origin: left;
          border-radius: 0 0 14px 14px;
          opacity: 0.7;
        }
 
        @media (max-width: 480px) {
          .tst-wrap {
            bottom: 16px;
            right: 16px;
            left: 16px;
            width: auto;
          }
        }
      `}</style>
    </>
  )
}
 
/* ─── single card ────────────────────────────────────────────────────────── */
function ToastCard({ t, onDismiss }: { t: ToastItem; onDismiss: () => void }) {
  const cfg = CONFIG[t.type]
  const barRef = useRef<HTMLDivElement>(null)
 
  /* animate progress bar */
  useEffect(() => {
    const el = barRef.current
    if (!el) return
    el.style.transition = "none"
    el.style.transform = "scaleX(1)"
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = `transform ${t.duration}ms linear`
      el.style.transform = "scaleX(0)"
    }))
  }, [t.id, t.duration])
 
  return (
    <div
      className={`tst-card ${t._leaving ? "tst-card--out" : "tst-card--in"}`}
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <div className="tst-icon-wrap" style={{ background: cfg.iconBg, color: cfg.iconColor }}>
        {cfg.icon}
      </div>
 
      <span className="tst-msg">{t.message}</span>
 
      <button className="tst-close" onClick={onDismiss}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
 
      <div className="tst-bar-track">
        <div ref={barRef} className="tst-bar" style={{ background: cfg.bar }}/>
      </div>
    </div>
  )
}