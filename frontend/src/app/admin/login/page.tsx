"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export default function AdminLogin() {

  const router = useRouter()
  const { login, user } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {

    try {
      setIsLoading(true)
      setError("")

      const res=await login({ email, password })
   if(res?.role=="admin"||res?.role=="editor"){
    router.push("/admin")
   }

   

    } catch {
      setError("Invalid credentials")
    } finally {
      setIsLoading(false)
    }

  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin()
  }

  return (
    <div className="login-root">

      {/* Background blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      {/* Grid texture */}
      <div className="grid-overlay" />

      {/* Card */}
      <div className="login-card">

        {/* Brand */}
        <div className="login-brand">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div className="brand-text">
            <h1 className="login-title">Admin Panel</h1>
            <p className="login-sub">Sign in to your workspace</p>
          </div>
        </div>

        {/* Divider */}
        <div className="login-divider" />

        {/* Fields */}
        <div className="login-fields">

          <div className="field-group">
            <label className="field-label">Email address</label>
            <div className="field-wrap">
              <span className="field-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </span>
              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="field-input"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <div className="field-wrap">
              <span className="field-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="field-input"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="field-eye"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Error */}
        {error && (
          <div className="login-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleLogin}
          disabled={isLoading || !email || !password}
          className="login-btn"
        >
          {isLoading ? (
            <span className="btn-spinner" />
          ) : (
            <>
              <span>Sign in</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </>
          )}
        </button>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0a0a0f;
          --surface: #111118;
          --elevated: #16161f;
          --border: rgba(255,255,255,0.08);
          --border-focus: rgba(99,102,241,0.5);
          --text: rgba(255,255,255,0.90);
          --muted: rgba(255,255,255,0.38);
          --accent: #6366f1;
          --accent-dim: rgba(99,102,241,0.13);
          --accent-hover: #7577f3;
          --danger: #f87171;
          --danger-dim: rgba(248,113,113,0.1);
          --danger-border: rgba(248,113,113,0.25);
          --font: 'DM Sans', -apple-system, sans-serif;
          --radius: 14px;
          --transition: 0.18s cubic-bezier(0.4,0,0.2,1);
        }

        html, body { height: 100%; background: var(--bg); }

        /* ── Root ── */
        .login-root {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: var(--bg);
          font-family: var(--font);
          position: relative;
          overflow: hidden;
          padding: 24px;
        }

        /* ── Background Blobs ── */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: blob-drift 12s ease-in-out infinite alternate;
        }

        .blob-1 {
          width: 400px; height: 400px;
          background: rgba(99,102,241,0.12);
          top: -100px; left: -80px;
          animation-duration: 14s;
        }

        .blob-2 {
          width: 300px; height: 300px;
          background: rgba(139,92,246,0.09);
          bottom: -60px; right: -60px;
          animation-duration: 10s;
          animation-delay: -4s;
        }

        .blob-3 {
          width: 200px; height: 200px;
          background: rgba(244,114,182,0.06);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation-duration: 18s;
          animation-delay: -8s;
        }

        @keyframes blob-drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 20px) scale(1.08); }
        }

        /* ── Grid overlay ── */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent);
        }

        /* ── Card ── */
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 36px 36px 32px;
          display: flex;
          flex-direction: column;
          gap: 22px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04),
            0 24px 80px rgba(0,0,0,0.45),
            0 0 60px rgba(99,102,241,0.07);
          animation: card-in 0.5s cubic-bezier(0.4,0,0.2,1) both;
        }

        @keyframes card-in {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ── Brand ── */
        .login-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-icon {
          width: 48px; height: 48px;
          border-radius: 13px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 6px 20px rgba(99,102,241,0.4);
        }

        .brand-text { display: flex; flex-direction: column; gap: 2px; }

        .login-title {
          font-family: 'Syne', sans-serif;
          font-size: 20px; font-weight: 800;
          color: var(--text); letter-spacing: -0.02em; line-height: 1.2;
        }

        .login-sub {
          font-size: 13px; color: var(--muted); font-weight: 400;
        }

        /* ── Divider ── */
        .login-divider {
          height: 1px;
          background: var(--border);
          margin: -4px 0;
        }

        /* ── Fields ── */
        .login-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field-label {
          font-size: 12px; font-weight: 600;
          color: var(--muted);
          letter-spacing: 0.06em; text-transform: uppercase;
        }

        .field-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-icon {
          position: absolute;
          left: 13px;
          color: var(--muted);
          display: flex; align-items: center;
          pointer-events: none;
          transition: color var(--transition);
        }

        .field-input {
          width: 100%;
          background: var(--elevated);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 42px 12px 40px;
          color: var(--text);
          font-family: var(--font);
          font-size: 14px; font-weight: 400;
          outline: none;
          transition:
            border-color var(--transition),
            box-shadow var(--transition),
            background var(--transition);
        }

        .field-input::placeholder { color: var(--muted); }

        .field-input:focus {
          border-color: var(--border-focus);
          background: #1a1a24;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        .field-input:focus + .field-icon,
        .field-wrap:focus-within .field-icon {
          color: var(--accent);
        }

        .field-eye {
          position: absolute; right: 12px;
          background: none; border: none; cursor: pointer;
          color: var(--muted); padding: 4px;
          display: flex; align-items: center;
          border-radius: 5px;
          transition: color var(--transition);
        }

        .field-eye:hover { color: var(--text); }

        /* ── Error ── */
        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 14px;
          border-radius: 10px;
          background: var(--danger-dim);
          border: 1px solid var(--danger-border);
          color: var(--danger);
          font-size: 13px; font-weight: 500;
          animation: err-in 0.25s cubic-bezier(0.4,0,0.2,1) both;
        }

        @keyframes err-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Button ── */
        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 13px 20px;
          border-radius: 11px;
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: #fff;
          font-family: var(--font);
          font-size: 14px; font-weight: 600;
          border: none; cursor: pointer;
          letter-spacing: 0.01em;
          transition:
            opacity var(--transition),
            transform var(--transition),
            box-shadow var(--transition);
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
          position: relative;
          overflow: hidden;
        }

        .login-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent);
          opacity: 0;
          transition: opacity var(--transition);
        }

        .login-btn:hover:not(:disabled)::before { opacity: 1; }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(99,102,241,0.45);
        }

        .login-btn:active:not(:disabled) { transform: translateY(0); }

        .login-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Spinner */
        .btn-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin .65s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .login-card { padding: 28px 22px 24px; border-radius: 16px; }
          .login-title { font-size: 18px; }
        }
      `}</style>

    </div>
  )
}