"use client"

import { useEffect, useState, useRef } from "react"
import api from "@/lib/axios"

/* ─── types ──────────────────────────────────────────────────────────────── */
type Stats = {
  total_earnings: number
  total_posts:    number
  total_views:    number
}
type ChartPoint = { date: string; earnings?: number; views?: number }
type TopPost    = { title: string; views: number; slug?: string }
type Analytics  = {
  stats:         Stats
  earningsChart: ChartPoint[]
  viewsChart:    ChartPoint[]
  topPosts:      TopPost[]
}

/* ─── helpers ────────────────────────────────────────────────────────────── */
function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K"
  return String(n)
}
function fmtCurrency(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 })
}
function shortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

/* ════════════════════════════════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const [data,    setData]    = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await api.get("/creatoranalytics/creator/analytics")
      setData(res.data)
    } catch (err: any) {
      setError(
        err?.response?.status === 403
          ? "You don't have permission to view analytics."
          : err?.response?.status === 404
          ? "Analytics data not found."
          : err?.response?.data?.message || "Failed to load analytics. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  /* ── loading skeleton ── */
  if (loading) return (
    <div className="an">
      <div className="an-header">
        <div className="an-eyebrow"><span className="an-dot"/>Creator Dashboard</div>
        <div className="sk-title"/>
      </div>
      <div className="an-stats-grid">
        {[0,1,2].map(i => <div key={i} className="sk-card" style={{ animationDelay: `${i*0.08}s` }}/>)}
      </div>
      <div className="an-charts-row">
        {[0,1].map(i => <div key={i} className="sk-chart" style={{ animationDelay: `${0.24+i*0.08}s` }}/>)}
      </div>
      <div className="sk-chart" style={{ animationDelay: "0.4s" }}/>
      <style>{styles}</style>
    </div>
  )

  /* ── error state ── */
  if (error) return (
    <div className="an">
      <div className="an-error-box">
        <div className="an-error-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3 className="an-error-title">Couldn't load analytics</h3>
        <p className="an-error-msg">{error}</p>
        <button className="an-retry-btn" onClick={load}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
          </svg>
          Try again
        </button>
      </div>
      <style>{styles}</style>
    </div>
  )

  if (!data) return null

  const { stats, earningsChart, viewsChart, topPosts } = data
  const maxViews = Math.max(...(topPosts || []).map(p => p.views || 0), 1)

  return (
    <div className="an">

      {/* ── Header ── */}
      <div className="an-header">
        <div>
          <div className="an-eyebrow"><span className="an-dot"/>Creator Dashboard</div>
          <h1 className="an-title">Analytics</h1>
          <p className="an-sub">Your content performance at a glance</p>
        </div>
        <button className="an-refresh-btn" onClick={load} title="Refresh data">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
          </svg>
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="an-stats-grid">
        <StatCard
          label="Total earnings"
          value={fmtCurrency(stats.total_earnings ?? 0)}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          accent="var(--grn)"
          accentBg="var(--grn-a)"
          delay="0s"
        />
        <StatCard
          label="Total posts"
          value={fmt(stats.total_posts ?? 0)}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
          accent="var(--acc-l)"
          accentBg="var(--acc-a)"
          delay="0.06s"
        />
        <StatCard
          label="Total views"
          value={fmt(stats.total_views ?? 0)}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
          accent="var(--amb)"
          accentBg="var(--amb-a)"
          delay="0.12s"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="an-charts-row">
        <BarChart
          title="Earnings"
          subtitle="Last 7 days"
          data={earningsChart ?? []}
          field="earnings"
          color="var(--grn)"
          colorDim="var(--grn-a)"
          formatValue={v => "₹" + Number(v).toLocaleString("en-IN")}
          delay="0.18s"
        />
        <BarChart
          title="Views"
          subtitle="Last 7 days"
          data={viewsChart ?? []}
          field="views"
          color="var(--acc-l)"
          colorDim="var(--acc-a)"
          formatValue={v => fmt(Number(v)) + " views"}
          delay="0.24s"
        />
      </div>

      {/* ── Top posts ── */}
      <div className="an-card" style={{ animationDelay: "0.3s" }}>
        <div className="an-card-hd">
          <div>
            <div className="an-card-title">Top posts</div>
            <div className="an-card-sub">Ranked by views</div>
          </div>
          <span className="an-count-badge">{(topPosts || []).length}</span>
        </div>

        {!topPosts || topPosts.length === 0 ? (
          <div className="an-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>No posts yet</p>
          </div>
        ) : (
          <div className="an-top-posts">
            {topPosts.map((p, i) => (
              <div key={i} className="an-post-row">
                <div className="an-post-rank">#{i + 1}</div>
                <div className="an-post-info">
                  <div className="an-post-title">{p.title}</div>
                  <div className="an-post-bar-wrap">
                    <div
                      className="an-post-bar"
                      style={{ width: `${(p.views / maxViews) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="an-post-views">
                  <span className="an-post-views-num">{fmt(p.views)}</span>
                  <span className="an-post-views-label">views</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{styles}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════════════════════════════════ */
function StatCard({
  label, value, icon, accent, accentBg, delay,
}: {
  label: string; value: string; icon: React.ReactNode
  accent: string; accentBg: string; delay: string
}) {
  return (
    <div className="an-stat-card" style={{ animationDelay: delay }}>
      <div className="an-stat-icon" style={{ background: accentBg, color: accent }}>
        {icon}
      </div>
      <div className="an-stat-label">{label}</div>
      <div className="an-stat-value" style={{ color: accent }}>{value}</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   BAR CHART  (pure SVG — no lib needed)
═══════════════════════════════════════════════════════════════════════════ */
function BarChart({
  title, subtitle, data, field, color, colorDim, formatValue, delay,
}: {
  title: string; subtitle: string
  data: ChartPoint[]; field: string
  color: string; colorDim: string
  formatValue: (v: number) => string
  delay: string
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const svgRef  = useRef<SVGSVGElement>(null)

  const W = 380, H = 120, PAD = 8
  const values = data.map(d => Number((d as any)[field] ?? 0))
  const maxVal  = Math.max(...values, 1)
  const barW    = data.length > 0 ? Math.floor((W - PAD * 2) / data.length) : 40
  const gap     = Math.max(3, barW * 0.18)
  const bw      = barW - gap

  if (!data || data.length === 0) return (
    <div className="an-card" style={{ animationDelay: delay }}>
      <div className="an-card-hd">
        <div>
          <div className="an-card-title">{title}</div>
          <div className="an-card-sub">{subtitle}</div>
        </div>
      </div>
      <div className="an-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
        </svg>
        <p>No data yet</p>
      </div>
    </div>
  )

  const hv = hovered !== null ? values[hovered] : null

  return (
    <div className="an-card" style={{ animationDelay: delay }}>
      <div className="an-card-hd">
        <div>
          <div className="an-card-title">{title}</div>
          <div className="an-card-sub">{subtitle}</div>
        </div>
        {hv !== null && (
          <div className="an-chart-tooltip" style={{ color }}>
            {formatValue(hv)}
          </div>
        )}
      </div>

      {/* SVG bars */}
      <svg
        ref={svgRef}
        width="100%" viewBox={`0 0 ${W} ${H + 20}`}
        style={{ overflow: "visible", display: "block" }}
      >
        <defs>
          <linearGradient id={`grad-${field}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="1"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.35"/>
          </linearGradient>
        </defs>

        {/* grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => {
          const y = PAD + (1 - f) * H
          return (
            <line key={f} x1={PAD} y1={y} x2={W - PAD} y2={y}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          )
        })}

        {data.map((d, i) => {
          const rawVal = Number((d as any)[field] ?? 0)
          const bh     = Math.max(2, (rawVal / maxVal) * H)
          const x      = PAD + i * barW + gap / 2
          const y      = PAD + H - bh
          const isHov  = hovered === i
          const rx     = Math.min(4, bw / 4)

          return (
            <g key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              {/* hover bg */}
              <rect
                x={x - gap / 2} y={PAD} width={barW} height={H + 4}
                fill={isHov ? "rgba(255,255,255,0.03)" : "transparent"}
                rx="6"
              />
              {/* bar */}
              <rect
                x={x} y={y} width={bw} height={bh} rx={rx}
                fill={isHov ? color : `url(#grad-${field})`}
                opacity={isHov ? 1 : 0.8}
                style={{ transition: "opacity 0.15s, fill 0.15s" }}
              />
              {/* date label */}
              <text
                x={x + bw / 2} y={PAD + H + 14}
                textAnchor="middle"
                fontSize="10"
                fill={isHov ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)"}
                fontFamily="'DM Sans', sans-serif"
                style={{ transition: "fill 0.15s" }}
              >
                {shortDate(d.date)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ─── styles ─────────────────────────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #09090e; --s0: #0f0f17; --s1: #141420; --s2: #1a1a28;
    --b0: rgba(255,255,255,0.06); --b1: rgba(255,255,255,0.11);
    --t0: rgba(255,255,255,0.92); --t1: rgba(255,255,255,0.55);
    --t2: rgba(255,255,255,0.28); --t3: rgba(255,255,255,0.12);
    --acc: #6366f1; --acc-l: #a5b4fc; --acc-a: rgba(99,102,241,0.12);
    --grn: #34d399; --grn-a: rgba(52,211,153,0.12); --grn-b: rgba(52,211,153,0.25);
    --amb: #fbbf24; --amb-a: rgba(251,191,36,0.12);
    --red: #f87171; --red-a: rgba(248,113,113,0.12);
    --font: 'DM Sans', -apple-system, sans-serif;
    --r: 12px; --tr: 0.16s cubic-bezier(0.4,0,0.2,1);
  }

  .an {
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-family: var(--font);
    animation: an-in 0.4s ease both;
    padding-bottom: 60px;
  }
  @keyframes an-in { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }

  /* ── header ── */
  .an-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .an-eyebrow {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--acc);
    margin-bottom: 6px;
  }
  .an-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--acc);
    box-shadow: 0 0 8px rgba(99,102,241,0.6);
    animation: an-pulse 2.4s ease-in-out infinite;
  }
  @keyframes an-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.72)} }
  .an-title {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: clamp(26px,4vw,34px);
    color: var(--t0);
    letter-spacing: -0.025em;
    line-height: 1.1;
  }
  .an-sub { font-size: 13px; color: var(--t1); margin-top: 4px; }
  .an-refresh-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 38px; height: 38px;
    background: var(--s1); border: 1px solid var(--b0); border-radius: var(--r);
    color: var(--t1); cursor: pointer;
    transition: color var(--tr), border-color var(--tr), transform var(--tr);
  }
  .an-refresh-btn:hover { color: var(--t0); border-color: var(--b1); transform: rotate(20deg); }

  /* ── stat cards ── */
  .an-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0,1fr));
    gap: 14px;
  }
  .an-stat-card {
    background: var(--s1);
    border: 1px solid var(--b0);
    border-radius: 16px;
    padding: 20px 22px 22px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: an-in 0.4s ease both;
    transition: border-color var(--tr), transform var(--tr);
  }
  .an-stat-card:hover { border-color: var(--b1); transform: translateY(-2px); }
  .an-stat-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .an-stat-label {
    font-size: 12px; font-weight: 500;
    color: var(--t2); text-transform: uppercase; letter-spacing: 0.06em;
  }
  .an-stat-value {
    font-family: 'Syne', sans-serif;
    font-size: clamp(22px,3vw,30px);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1;
  }

  /* ── chart layout ── */
  .an-charts-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  /* ── shared card ── */
  .an-card {
    background: var(--s1);
    border: 1px solid var(--b0);
    border-radius: 16px;
    padding: 20px 22px;
    animation: an-in 0.4s ease both;
    transition: border-color var(--tr);
  }
  .an-card:hover { border-color: var(--b1); }
  .an-card-hd {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }
  .an-card-title {
    font-family: 'Syne', sans-serif;
    font-size: 15px; font-weight: 700;
    color: var(--t0); letter-spacing: -0.01em;
  }
  .an-card-sub { font-size: 12px; color: var(--t2); margin-top: 3px; }
  .an-chart-tooltip {
    font-family: 'Syne', sans-serif;
    font-size: 15px; font-weight: 700;
    letter-spacing: -0.01em;
    animation: an-in 0.2s ease both;
  }
  .an-count-badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 24px; height: 24px; padding: 0 6px;
    background: var(--acc-a); color: var(--acc-l);
    border-radius: 8px; font-size: 12px; font-weight: 600;
  }

  /* ── empty state ── */
  .an-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; padding: 36px 20px;
    color: var(--t2); font-size: 13.5px;
  }

  /* ── top posts ── */
  .an-top-posts { display: flex; flex-direction: column; gap: 0; }
  .an-post-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 13px 0;
    border-bottom: 1px solid var(--b0);
    transition: background var(--tr);
  }
  .an-post-row:last-child { border-bottom: none; }
  .an-post-row:hover { background: rgba(255,255,255,0.015); margin: 0 -22px; padding: 13px 22px; border-radius: 0; }
  .an-post-rank {
    font-family: 'Syne', sans-serif;
    font-size: 13px; font-weight: 800;
    color: var(--t3);
    width: 28px; flex-shrink: 0;
    text-align: center;
  }
  .an-post-info { flex: 1; min-width: 0; }
  .an-post-title {
    font-size: 13.5px; font-weight: 500; color: var(--t0);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-bottom: 7px;
  }
  .an-post-bar-wrap {
    height: 3px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden;
  }
  .an-post-bar {
    height: 100%; background: var(--acc-l); border-radius: 99px;
    transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
    opacity: 0.7;
  }
  .an-post-views {
    display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0;
  }
  .an-post-views-num {
    font-family: 'Syne', sans-serif;
    font-size: 15px; font-weight: 800; color: var(--t0); letter-spacing: -0.01em;
  }
  .an-post-views-label { font-size: 10.5px; color: var(--t2); margin-top: 1px; }

  /* ── error ── */
  .an-error-box {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px; padding: 72px 24px;
    background: var(--s1); border: 1px solid var(--b0); border-radius: 16px;
    text-align: center;
  }
  .an-error-icon {
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--red-a); color: var(--red);
    display: flex; align-items: center; justify-content: center;
  }
  .an-error-title {
    font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: var(--t0);
  }
  .an-error-msg { font-size: 14px; color: var(--t1); max-width: 320px; line-height: 1.6; }
  .an-retry-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 20px;
    background: var(--s0); border: 1px solid var(--b1); border-radius: var(--r);
    font-family: var(--font); font-size: 13.5px; font-weight: 500; color: var(--t0);
    cursor: pointer; transition: background var(--tr), border-color var(--tr), transform var(--tr);
  }
  .an-retry-btn:hover { background: var(--s2); border-color: rgba(255,255,255,0.18); transform: translateY(-1px); }

  /* ── skeletons ── */
  @keyframes sk-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
  .sk-title {
    width: 220px; height: 36px; border-radius: 8px;
    background: var(--s1); animation: sk-pulse 1.5s ease infinite;
  }
  .sk-card {
    height: 130px; border-radius: 16px;
    background: var(--s1); animation: sk-pulse 1.5s ease infinite;
  }
  .sk-chart {
    height: 200px; border-radius: 16px;
    background: var(--s1); animation: sk-pulse 1.5s ease infinite;
  }

  /* ── responsive ── */
  @media (max-width: 768px) {
    .an-stats-grid { grid-template-columns: 1fr 1fr; }
    .an-stats-grid > div:last-child { grid-column: span 2; }
    .an-charts-row { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .an-stats-grid { grid-template-columns: 1fr; }
    .an-stats-grid > div:last-child { grid-column: 1; }
    .an-card { padding: 16px; }
    .an-stat-card { padding: 16px; }
  }
`