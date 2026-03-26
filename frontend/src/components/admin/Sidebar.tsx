"use client"

import Link from "next/link"
import api from "@/lib/axios"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
    {
    href: "/admin/wallet",
    label: "Wallet",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
     {
    href: "/admin/payout",
    label: "Payout",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        <path d="M21 21v-2a4 4 0 0 0-3-3.85"/>
      </svg>
    ),
  },
  {
    href: "/admin/posts",
    label: "Posts",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="16" y2="17"/>
        <line x1="8" y1="9" x2="10" y2="9"/>
      </svg>
    ),
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: "/admin/tags",
    label: "Tags",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
   {
    href: "/admin/comments",
    label: "Comments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
    
  }, {
    href: "/admin/analystics",
    label: "Analystics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),},
    {
    href: "/admin/subscriptions",
    label: "Subscriptions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),}
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <>
      <aside className="sidebar">

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">Admin Panel</span>
            <span className="brand-sub">Control Center</span>
          </div>
        </div>

        {/* Divider */}
        <div className="sidebar-divider" />

        {/* Nav label */}
        <span className="nav-label">Navigation</span>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? "nav-item--active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.label}</span>
                {isActive && <span className="nav-pip" />}
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="sidebar-spacer" />

        {/* Divider */}
        <div className="sidebar-divider" />

        {/* Logout */}
        <button onClick={logout} className="logout-btn">
          <span className="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          <span className="nav-text">Logout</span>
        </button>

      </aside>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        :root {
          --sidebar-w: 260px;
          --bg: #0a0a0f;
          --surface: #111118;
          --elevated: #18181f;
          --border: rgba(255,255,255,0.07);
          --text: rgba(255,255,255,0.88);
          --muted: rgba(255,255,255,0.35);
          --accent: #6366f1;
          --accent-dim: rgba(99,102,241,0.14);
          --accent-glow: rgba(99,102,241,0.3);
          --danger: #f87171;
          --danger-dim: rgba(248,113,113,0.1);
          --font: 'DM Sans', -apple-system, sans-serif;
          --radius: 10px;
          --transition: 0.18s cubic-bezier(0.4,0,0.2,1);
        }

        /* ── Sidebar Shell ── */
        .sidebar {
          position: fixed;
          top: 0; left: 0;
          width: var(--sidebar-w);
          height: 100vh;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          font-family: var(--font);
          z-index: 100;
          overflow-y: auto;
          overflow-x: hidden;
          animation: slide-in 0.35s cubic-bezier(0.4,0,0.2,1) both;
        }

        .sidebar::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 180px;
          background: radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* ── Brand ── */
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 8px 4px;
          position: relative;
          z-index: 1;
        }

        .brand-icon {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(99,102,241,0.35);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .brand-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: var(--text);
          line-height: 1.2;
          letter-spacing: -0.01em;
        }

        .brand-sub {
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 400;
        }

        /* ── Divider ── */
        .sidebar-divider {
          height: 1px;
          background: var(--border);
          margin: 18px 0;
          flex-shrink: 0;
        }

        /* ── Nav Label ── */
        .nav-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          padding: 0 12px;
          margin-bottom: 6px;
          flex-shrink: 0;
        }

        /* ── Nav ── */
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px 12px;
          border-radius: var(--radius);
          color: var(--muted);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          position: relative;
          transition:
            color var(--transition),
            background var(--transition),
            transform var(--transition);
        }

        .nav-item:hover {
          color: var(--text);
          background: rgba(255,255,255,0.05);
          transform: translateX(2px);
        }

        .nav-item--active {
          color: var(--text);
          background: var(--accent-dim);
        }

        .nav-item--active .nav-icon {
          color: var(--accent);
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: color var(--transition);
          width: 20px;
        }

        .nav-text {
          flex: 1;
          white-space: nowrap;
        }

        .nav-pip {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent-glow);
          flex-shrink: 0;
        }

        /* ── Spacer ── */
        .sidebar-spacer {
          flex: 1;
          min-height: 16px;
        }

        /* ── Logout ── */
        .logout-btn {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px 12px;
          border-radius: var(--radius);
          color: var(--danger);
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: var(--font);
          font-size: 14px;
          font-weight: 500;
          width: 100%;
          text-align: left;
          transition:
            background var(--transition),
            transform var(--transition);
        }

        .logout-btn:hover {
          background: var(--danger-dim);
          transform: translateX(2px);
        }

        /* ── Scrollbar ── */
        .sidebar::-webkit-scrollbar { width: 3px; }
        .sidebar::-webkit-scrollbar-track { background: transparent; }
        .sidebar::-webkit-scrollbar-thumb {
          background: rgba(99,102,241,0.2);
          border-radius: 4px;
        }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          :root { --sidebar-w: 220px; }
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
            box-shadow: 4px 0 32px rgba(0,0,0,0.5);
          }
          .sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  )
}