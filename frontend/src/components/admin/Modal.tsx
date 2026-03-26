"use client"
 
import { useEffect } from "react"
 
type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}
 
export default function Modal({
  open,
  onClose,
  title,
  children
}: Props) {
 
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])
 
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])
 
  if (!open) return null
 
  return (
 
    <div className="modal-backdrop" onClick={onClose}>
 
      <div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
 
        {/* Glow orb */}
        <div className="modal-glow" />
 
        {/* Header */}
        <div className="modal-header">
 
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
 
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
 
        </div>
 
        {/* Divider */}
        <div className="modal-divider" />
 
        {/* Body */}
        <div className="modal-body">
          {children}
        </div>
 
      </div>
 
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
 
        *, *::before, *::after { box-sizing: border-box; }
 
        :root {
          --m-overlay:  rgba(0,0,0,0.7);
          --m-bg:       #111118;
          --m-border:   rgba(255,255,255,0.08);
          --m-text:     rgba(255,255,255,0.9);
          --m-muted:    rgba(255,255,255,0.35);
          --m-accent:   #6366f1;
          --m-close-hover: rgba(255,255,255,0.07);
          --m-font:     'DM Sans', -apple-system, sans-serif;
          --m-radius:   16px;
        }
 
        /* ── Backdrop ── */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: var(--m-overlay);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 16px;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: backdrop-in 0.2s ease both;
        }
 
        @keyframes backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
 
        /* ── Box ── */
        .modal-box {
          position: relative;
          background: var(--m-bg);
          border: 1px solid var(--m-border);
          border-radius: var(--m-radius);
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: var(--m-font);
          box-shadow:
            0 0 0 1px rgba(99,102,241,0.08),
            0 24px 64px rgba(0,0,0,0.6),
            0 8px 24px rgba(0,0,0,0.4);
          animation: modal-in 0.28s cubic-bezier(0.34,1.3,0.64,1) both;
        }
 
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
 
        /* ── Glow orb ── */
        .modal-glow {
          position: absolute;
          top: -60px; left: 50%;
          transform: translateX(-50%);
          width: 280px; height: 140px;
          background: radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
 
        /* ── Header ── */
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 22px 18px;
          position: relative;
          z-index: 1;
          flex-shrink: 0;
        }
 
        .modal-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 17px;
          color: var(--m-text);
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin: 0;
        }
 
        /* ── Close ── */
        .modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px; height: 32px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--m-muted);
          cursor: pointer;
          transition:
            background 0.15s ease,
            color 0.15s ease,
            border-color 0.15s ease;
          flex-shrink: 0;
        }
 
        .modal-close:hover {
          background: var(--m-close-hover);
          border-color: var(--m-border);
          color: var(--m-text);
        }
 
        /* ── Divider ── */
        .modal-divider {
          height: 1px;
          background: var(--m-border);
          flex-shrink: 0;
          margin: 0 22px;
        }
 
        /* ── Body ── */
        .modal-body {
          padding: 22px 22px 24px;
          overflow-y: auto;
          flex: 1;
          position: relative;
          z-index: 1;
          color: var(--m-text);
          font-size: 14px;
          line-height: 1.6;
        }
 
        .modal-body::-webkit-scrollbar { width: 4px; }
        .modal-body::-webkit-scrollbar-track { background: transparent; }
        .modal-body::-webkit-scrollbar-thumb {
          background: rgba(99,102,241,0.25);
          border-radius: 4px;
        }
 
        /* ── Responsive ── */
        @media (max-width: 540px) {
          .modal-box {
            max-width: 100%;
            border-radius: 14px 14px 0 0;
            max-height: 85vh;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            animation: sheet-in 0.3s cubic-bezier(0.4,0,0.2,1) both;
          }
 
          .modal-backdrop {
            align-items: flex-end;
            padding: 0;
          }
 
          @keyframes sheet-in {
            from { opacity: 0; transform: translateY(100%); }
            to   { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>
 
    </div>
 
  )
 
}