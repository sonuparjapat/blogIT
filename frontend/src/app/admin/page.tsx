"use client";

import AnalyticsChart from "@/components/admin/AnalyticsChart";
import api from "@/lib/axios";
import { useEffect, useState } from "react";

const statCards = [
  {
    key: "posts",
    label: "Total Posts",
    prefix: "",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="16" y2="17"/>
      </svg>
    ),
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.2)",
    glow: "rgba(99,102,241,0.25)",
  },
  {
    key: "users",
    label: "Total Users",
    prefix: "",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        <path d="M21 21v-2a4 4 0 0 0-3-3.85"/>
      </svg>
    ),
    color: "#34d399",
    bg: "rgba(52,211,153,0.10)",
    border: "rgba(52,211,153,0.2)",
    glow: "rgba(52,211,153,0.22)",
  },
  {
    key: "views",
    label: "Total Views",
    prefix: "",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.2)",
    glow: "rgba(245,158,11,0.22)",
  },
  {
    key: "revenue",
    label: "Revenue",
    prefix: "₹",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    color: "#f472b6",
    bg: "rgba(244,114,182,0.10)",
    border: "rgba(244,114,182,0.2)",
    glow: "rgba(244,114,182,0.22)",
  },
]

export default function AdminDashboard() {

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<any>(false)

  useEffect(() => {

    const getdata = async () => {
      try {
        setLoading(true)
        const res = await api.get('/admin/stats')
  setStats({
  posts: res?.data?.total_posts || 0,
  users: res?.data?.total_users || 0,
  views: res?.data?.total_views || 0,
  revenue: res?.data?.total_revenue || 0,
  recent_posts:res?.data?.recent_posts||0,
  top_posts:res?.data?.top_posts||0,
  daily_views:res?.data?.daily_views||0
})
    console.log(res,"response")
      } catch (err: any) {
        console.log(err?.message)
      } finally {
        setLoading(false)
      }
    }
    getdata()

  }, []);

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-inner">
        <div className="loading-dots">
          <span /><span /><span />
        </div>
        <p className="loading-label">Loading dashboard…</p>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap');
        .loading-screen {
          display:flex; align-items:center; justify-content:center;
          min-height:60vh; font-family:'DM Sans',sans-serif;
        }
        .loading-inner { display:flex; flex-direction:column; align-items:center; gap:20px; }
        .loading-dots { display:flex; gap:8px; }
        .loading-dots span {
          width:10px; height:10px; border-radius:50%; background:#6366f1;
          animation:ld 1.3s ease-in-out infinite;
        }
        .loading-dots span:nth-child(2){ background:#8b5cf6; animation-delay:.18s; }
        .loading-dots span:nth-child(3){ background:#a78bfa; animation-delay:.36s; }
        @keyframes ld { 0%,80%,100%{transform:scale(.7);opacity:.4} 40%{transform:scale(1.15);opacity:1} }
        .loading-label { font-size:13px; color:rgba(255,255,255,.35); letter-spacing:.1em; text-transform:uppercase; }
      `}</style>
    </div>
  );

  return (

    <div className="dashboard">

      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-sub">Welcome back — here's what's happening.</p>
        </div>
        <div className="dash-date">
          {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div
            className="stat-card"
            key={card.key}
            style={{
              "--card-color": card.color,
              "--card-bg": card.bg,
              "--card-border": card.border,
              "--card-glow": card.glow,
              animationDelay: `${i * 0.08}s`,
            } as React.CSSProperties}
          >
            <div className="card-top">
              <span className="card-label">{card.label}</span>
              <div className="card-icon">{card.icon}</div>
            </div>
            <div className="card-value">
              {card.prefix}
              <span className="value-num">
                {stats?.[card.key] !== undefined
                  ? Number(stats[card.key]).toLocaleString("en-IN")
                  : "—"}
              </span>
            </div>
            <div className="card-bar">
              <div className="card-bar-fill" />
            </div>
          </div>
        ))}
      </div>
      <div className="section">
  <h2 className="section-title">Top Posts</h2>

  <div className="list">
    {stats?.top_posts?.map((p:any)=>(
      <div key={p.id} className="list-item">
        <span>{p.title}</span>
        <span>{p.views} views</span>
      </div>
    ))}
  </div>
</div>


{/* 🔥 Recent Posts */}
<div className="section">
  <h2 className="section-title">Recent Posts</h2>

  <div className="list">
    {stats?.recent_posts?.map((p:any)=>(
      <div key={p.id} className="list-item">
        <span>{p.title}</span>
      </div>
    ))}
  </div>
</div>
<AnalyticsChart data={stats?.daily_views} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        :root {
          --surface: #111118;
          --border: rgba(255,255,255,0.07);
          --text: rgba(255,255,255,0.90);
          --muted: rgba(255,255,255,0.38);
          --font: 'DM Sans', -apple-system, sans-serif;
          --radius: 16px;
        }

        .dashboard {
          display:flex; flex-direction:column; gap:36px;
          font-family:var(--font);
          animation: dash-in .45s cubic-bezier(.4,0,.2,1) both;
        }

        @keyframes dash-in {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ── Header ── */
        .dash-header {
          display:flex; align-items:flex-end; justify-content:space-between;
          flex-wrap:wrap; gap:12px;
        }

        .dash-title {
          font-family:'Syne',sans-serif;
          font-size:28px; font-weight:800;
          color:var(--text); letter-spacing:-.03em; line-height:1.1;
        }
.section {
  background:#111118;
  border:1px solid rgba(255,255,255,0.07);
  border-radius:14px;
  padding:18px;
}

.section-title {
  font-size:14px;
  font-weight:600;
  margin-bottom:10px;
  color:rgba(255,255,255,0.8);
}

.list {
  display:flex;
  flex-direction:column;
  gap:8px;
}

.list-item {
  display:flex;
  justify-content:space-between;
  font-size:13px;
  color:rgba(255,255,255,0.6);
  padding:6px 0;
  border-bottom:1px solid rgba(255,255,255,0.05);
}
        .dash-sub {
          font-size:14px; color:var(--muted); margin-top:4px; font-weight:400;
        }

        .dash-date {
          font-size:12px; color:var(--muted); font-weight:500;
          letter-spacing:.04em; text-transform:uppercase;
          padding:6px 14px; border-radius:20px;
          background:var(--surface); border:1px solid var(--border);
          white-space:nowrap;
        }

        /* ── Grid ── */
        .stats-grid {
          display:grid;
          grid-template-columns: repeat(4, 1fr);
          gap:18px;
        }

        /* ── Card ── */
        .stat-card {
          background:var(--surface);
          border:1px solid var(--card-border, var(--border));
          border-radius:var(--radius);
          padding:22px 22px 18px;
          display:flex; flex-direction:column; gap:12px;
          position:relative; overflow:hidden;
          animation: card-in .4s cubic-bezier(.4,0,.2,1) both;
          transition: transform .18s cubic-bezier(.4,0,.2,1),
                      box-shadow .18s cubic-bezier(.4,0,.2,1);
        }

        @keyframes card-in {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }

        .stat-card::before {
          content:'';
          position:absolute; top:0; left:0; right:0; height:1px;
          background:linear-gradient(90deg, transparent, var(--card-color), transparent);
          opacity:.6;
        }

        .stat-card::after {
          content:'';
          position:absolute; top:-40px; right:-30px;
          width:100px; height:100px; border-radius:50%;
          background:var(--card-bg);
          filter:blur(20px);
          pointer-events:none;
        }

        .stat-card:hover {
          transform:translateY(-3px);
          box-shadow:0 12px 40px var(--card-glow, rgba(0,0,0,.2));
        }

        /* Card internals */
        .card-top {
          display:flex; align-items:center; justify-content:space-between;
        }

        .card-label {
          font-size:12px; font-weight:600; color:var(--muted);
          letter-spacing:.07em; text-transform:uppercase;
        }

        .card-icon {
          width:38px; height:38px; border-radius:10px;
          background:var(--card-bg);
          border:1px solid var(--card-border);
          display:flex; align-items:center; justify-content:center;
          color:var(--card-color);
          position:relative; z-index:1;
        }

        .card-value {
          font-family:'Syne',sans-serif;
          font-size:13px; font-weight:700; color:var(--muted);
          display:flex; align-items:baseline; gap:2px;
          position:relative; z-index:1;
        }

        .value-num {
          font-size:30px; font-weight:800;
          color:var(--text); letter-spacing:-.03em; line-height:1;
        }

        .card-bar {
          height:3px; border-radius:4px;
          background:rgba(255,255,255,0.06);
          overflow:hidden; position:relative; z-index:1;
        }

        .card-bar-fill {
          height:100%; border-radius:4px;
          background:var(--card-color);
          width:65%;
          animation:bar-grow .7s cubic-bezier(.4,0,.2,1) both;
          animation-delay:.3s;
          opacity:.7;
        }

        @keyframes bar-grow {
          from { width:0%; }
          to   { width:65%; }
        }

        /* ── Responsive ── */
        @media (max-width:1024px) {
          .stats-grid { grid-template-columns:repeat(2,1fr); }
        }

        @media (max-width:520px) {
          .stats-grid { grid-template-columns:1fr; }
          .dash-title { font-size:22px; }
          .dash-date { display:none; }
        }
      `}</style>

    </div>

  );
}