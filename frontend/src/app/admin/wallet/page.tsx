"use client"

import { useEffect, useState, useCallback } from "react"
import api from "@/lib/axios"

/* ─── types ──────────────────────────────────────────────────────────────── */
type Wallet = {
  total_earned:    number
  total_withdrawn: number
  balance:         number
}
type Earning = {
  id:          number
  post_title:  string | null
  amount:      number
  source:      string
  created_at:  string
}
type Meta = { page: number; totalPages: number; total: number }

/* ─── helpers ────────────────────────────────────────────────────────────── */
function fmtINR(n: number | string) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}
function sourceBadgeClass(source: string) {
  const s = source?.toLowerCase() ?? ""
  if (s.includes("subscription") || s.includes("sub"))  return "wb-badge--sub"
  if (s.includes("tip"))                                  return "wb-badge--tip"
  if (s.includes("ad") || s.includes("advert"))          return "wb-badge--ad"
  if (s.includes("bonus"))                                return "wb-badge--bonus"
  return "wb-badge--default"
}
const LIMIT = 10

/* ════════════════════════════════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════════════════════════════════ */
export default function WalletPage() {
  const [wallet,        setWallet]        = useState<Wallet | null>(null)
  const [earnings,      setEarnings]      = useState<Earning[]>([])
  const [meta,          setMeta]          = useState<Meta | null>(null)
  const [page,          setPage]          = useState(1)
  const [walletLoading, setWalletLoading] = useState(true)
  const [tableLoading,  setTableLoading]  = useState(true)
  const [walletError,   setWalletError]   = useState("")
  const [tableError,    setTableError]    = useState("")

  /* ── fetch wallet ── */
  const fetchWallet = useCallback(async () => {
    setWalletLoading(true)
    setWalletError("")
    try {
      const res = await api.get("/user/wallet")
      setWallet(res.data)
    } catch (err: any) {
      setWalletError(
        err?.response?.status === 403 ? "Access denied." :
        err?.response?.data?.message  || "Failed to load wallet."
      )
    } finally { setWalletLoading(false) }
  }, [])

  /* ── fetch earnings ── */
  const fetchEarnings = useCallback(async (pg: number) => {
    setTableLoading(true)
    setTableError("")
    try {
      const res = await api.get("/user/wallet/earnings", { params: { page: pg, limit: LIMIT } })
      const d   = res.data
      setEarnings(d.data ?? [])
      setMeta({ page: d.page, totalPages: d.totalPages, total: d.total })
    } catch (err: any) {
      setTableError(err?.response?.data?.message || "Failed to load earnings history.")
    } finally { setTableLoading(false) }
  }, [])

  useEffect(() => { fetchWallet() }, [fetchWallet])
  useEffect(() => { fetchEarnings(page) }, [page, fetchEarnings])

  const totalPages = meta?.totalPages ?? 1

  /* ── sparkline (simple inline bar from balance ratio) ── */
  const pctWithdrawn = wallet
    ? Math.min(100, wallet.total_earned > 0 ? (wallet.total_withdrawn / wallet.total_earned) * 100 : 0)
    : 0
  const pctBalance = wallet
    ? Math.min(100, wallet.total_earned > 0 ? (wallet.balance / wallet.total_earned) * 100 : 0)
    : 0

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="wb">

      {/* ── Header ── */}
      <div className="wb-header">
        <div>
          <div className="wb-eyebrow"><span className="wb-dot"/>Finance</div>
          <h1 className="wb-title">Wallet</h1>
          <p className="wb-sub">Track your earnings, withdrawals and balance</p>
        </div>
        <button
          className="wb-refresh-btn"
          onClick={() => { fetchWallet(); fetchEarnings(page) }}
          title="Refresh"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
          </svg>
        </button>
      </div>

      {/* ── Wallet cards ── */}
      {walletLoading ? (
        <div className="wb-stats-grid">
          {[0,1,2].map(i => <div key={i} className="wb-sk-card" style={{ animationDelay: `${i*0.07}s` }}/>)}
        </div>
      ) : walletError ? (
        <div className="wb-inline-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {walletError}
          <button className="wb-inline-retry" onClick={fetchWallet}>Retry</button>
        </div>
      ) : wallet && (
        <div className="wb-stats-grid">

          {/* Total earned */}
          <div className="wb-stat-card" style={{ animationDelay: "0s" }}>
            <div className="wb-stat-icon wb-stat-icon--grn">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div className="wb-stat-label">Total earned</div>
            <div className="wb-stat-value wb-stat-value--grn">{fmtINR(wallet.total_earned)}</div>
            <div className="wb-stat-bar-track">
              <div className="wb-stat-bar wb-stat-bar--grn" style={{ width: "100%" }}/>
            </div>
          </div>

          {/* Withdrawn */}
          <div className="wb-stat-card" style={{ animationDelay: "0.07s" }}>
            <div className="wb-stat-icon wb-stat-icon--amb">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </div>
            <div className="wb-stat-label">Withdrawn</div>
            <div className="wb-stat-value wb-stat-value--amb">{fmtINR(wallet.total_withdrawn)}</div>
            <div className="wb-stat-bar-track">
              <div className="wb-stat-bar wb-stat-bar--amb" style={{ width: `${pctWithdrawn}%` }}/>
            </div>
          </div>

          {/* Balance */}
          <div className="wb-stat-card wb-stat-card--accent" style={{ animationDelay: "0.14s" }}>
            <div className="wb-stat-icon wb-stat-icon--acc">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div className="wb-stat-label">Available balance</div>
            <div className="wb-stat-value wb-stat-value--acc">{fmtINR(wallet.balance)}</div>
            <div className="wb-stat-bar-track">
              <div className="wb-stat-bar wb-stat-bar--acc" style={{ width: `${pctBalance}%` }}/>
            </div>
          </div>

        </div>
      )}

      {/* ── Earnings history ── */}
      <div className="wb-card">
        <div className="wb-card-hd">
          <div>
            <div className="wb-card-title">Earnings history</div>
            <div className="wb-card-sub">
              {meta ? `${meta.total} transaction${meta.total !== 1 ? "s" : ""}` : "All transactions"}
            </div>
          </div>
          {meta && meta.total > 0 && (
            <span className="wb-count-badge">{meta.total}</span>
          )}
        </div>

        {tableLoading ? (
          <div className="wb-table-loading">
            <div className="wb-spinner"/>
            <span>Loading transactions…</span>
          </div>
        ) : tableError ? (
          <div className="wb-inline-error" style={{ margin: "0 0 4px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {tableError}
            <button className="wb-inline-retry" onClick={() => fetchEarnings(page)}>Retry</button>
          </div>
        ) : earnings.length === 0 ? (
          <div className="wb-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <p>No transactions yet</p>
            <span>Your earnings will appear here once you start monetising.</span>
          </div>
        ) : (
          <>
            <div className="wb-table-wrap">
              <table className="wb-table">
                <thead>
                  <tr>
                    <th>Post</th>
                    <th>Source</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map(e => (
                    <tr key={e.id}>
                      <td>
                        <span className="wb-post-title">{e.post_title || "—"}</span>
                      </td>
                      <td>
                        <span className={`wb-badge ${sourceBadgeClass(e.source)}`}>
                          {e.source}
                        </span>
                      </td>
                      <td>
                        <span className="wb-amount">
                          {fmtINR(e.amount)}
                        </span>
                      </td>
                      <td>
                        <span className="wb-date">{fmtDate(e.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="wb-pagination">
                <button className="wb-pg-btn" disabled={page <= 1} onClick={() => setPage(1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
                </button>
                <button className="wb-pg-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div className="wb-pg-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                    .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                      if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…")
                      acc.push(n)
                      return acc
                    }, [])
                    .map((n, i) =>
                      n === "…"
                        ? <span key={`e${i}`} className="wb-pg-ellipsis">…</span>
                        : <button key={n} className={`wb-pg-num ${page === n ? "wb-pg-num--on" : ""}`} onClick={() => setPage(n as number)}>{n}</button>
                    )}
                </div>
                <button className="wb-pg-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button className="wb-pg-btn" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                </button>
                <span className="wb-pg-info">{meta?.total ?? 0} total</span>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:#09090e; --s0:#0f0f17; --s1:#141420; --s2:#1a1a28;
          --b0:rgba(255,255,255,0.06); --b1:rgba(255,255,255,0.11);
          --t0:rgba(255,255,255,0.92); --t1:rgba(255,255,255,0.55);
          --t2:rgba(255,255,255,0.28); --t3:rgba(255,255,255,0.12);
          --acc:#6366f1; --acc-l:#a5b4fc; --acc-a:rgba(99,102,241,0.12); --acc-b:rgba(99,102,241,0.28);
          --grn:#34d399; --grn-a:rgba(52,211,153,0.12); --grn-b:rgba(52,211,153,0.25);
          --amb:#fbbf24; --amb-a:rgba(251,191,36,0.12); --amb-b:rgba(251,191,36,0.25);
          --red:#f87171; --red-a:rgba(248,113,113,0.12);
          --vio:#c084fc; --vio-a:rgba(192,132,252,0.12);
          --sky:#38bdf8; --sky-a:rgba(56,189,248,0.12);
          --font:'DM Sans',-apple-system,sans-serif;
          --r:12px; --tr:0.16s cubic-bezier(0.4,0,0.2,1);
        }

        .wb { display:flex; flex-direction:column; gap:20px; font-family:var(--font); animation:wb-in 0.4s ease both; padding-bottom:60px; }
        @keyframes wb-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes wb-spin { to{transform:rotate(360deg)} }

        /* header */
        .wb-header { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .wb-eyebrow { display:flex; align-items:center; gap:7px; font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:var(--grn); margin-bottom:5px; }
        .wb-dot { width:6px; height:6px; border-radius:50%; background:var(--grn); box-shadow:0 0 8px rgba(52,211,153,0.55); animation:wb-pulse 2.4s ease-in-out infinite; }
        @keyframes wb-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.72)} }
        .wb-title { font-family:'Syne',sans-serif; font-weight:800; font-size:clamp(26px,4vw,34px); color:var(--t0); letter-spacing:-0.025em; line-height:1.1; }
        .wb-sub { font-size:13px; color:var(--t1); margin-top:4px; }
        .wb-refresh-btn { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; background:var(--s1); border:1px solid var(--b0); border-radius:var(--r); color:var(--t1); cursor:pointer; transition:color var(--tr),border-color var(--tr),transform var(--tr); }
        .wb-refresh-btn:hover { color:var(--t0); border-color:var(--b1); transform:rotate(20deg); }

        /* stat cards */
        .wb-stats-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
        .wb-stat-card { background:var(--s1); border:1px solid var(--b0); border-radius:16px; padding:20px 22px 18px; display:flex; flex-direction:column; gap:10px; animation:wb-in 0.4s ease both; transition:border-color var(--tr),transform var(--tr); }
        .wb-stat-card:hover { border-color:var(--b1); transform:translateY(-2px); }
        .wb-stat-card--accent { border-color:rgba(99,102,241,0.18); }
        .wb-stat-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
        .wb-stat-icon--grn { background:var(--grn-a); color:var(--grn); }
        .wb-stat-icon--amb { background:var(--amb-a); color:var(--amb); }
        .wb-stat-icon--acc { background:var(--acc-a); color:var(--acc-l); }
        .wb-stat-label { font-size:11.5px; font-weight:500; color:var(--t2); text-transform:uppercase; letter-spacing:0.06em; }
        .wb-stat-value { font-family:'Syne',sans-serif; font-size:clamp(20px,3vw,26px); font-weight:800; letter-spacing:-0.02em; line-height:1; }
        .wb-stat-value--grn { color:var(--grn); }
        .wb-stat-value--amb { color:var(--amb); }
        .wb-stat-value--acc { color:var(--acc-l); }
        .wb-stat-bar-track { height:3px; background:rgba(255,255,255,0.05); border-radius:99px; overflow:hidden; margin-top:2px; }
        .wb-stat-bar { height:100%; border-radius:99px; transition:width 0.8s cubic-bezier(0.4,0,0.2,1); opacity:0.65; }
        .wb-stat-bar--grn { background:var(--grn); }
        .wb-stat-bar--amb { background:var(--amb); }
        .wb-stat-bar--acc { background:var(--acc-l); }

        /* card */
        .wb-card { background:var(--s1); border:1px solid var(--b0); border-radius:16px; padding:22px 24px; animation:wb-in 0.4s ease both; animation-delay:0.2s; }
        .wb-card-hd { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:18px; }
        .wb-card-title { font-family:'Syne',sans-serif; font-size:15px; font-weight:700; color:var(--t0); letter-spacing:-0.01em; }
        .wb-card-sub { font-size:12px; color:var(--t2); margin-top:3px; }
        .wb-count-badge { display:inline-flex; align-items:center; justify-content:center; min-width:24px; height:24px; padding:0 6px; background:var(--grn-a); color:var(--grn); border-radius:8px; font-size:12px; font-weight:600; }

        /* table */
        .wb-table-wrap { overflow-x:auto; }
        .wb-table { width:100%; border-collapse:collapse; font-size:13.5px; }
        .wb-table th { text-align:left; padding:10px 14px 10px; font-size:11px; font-weight:600; letter-spacing:0.07em; text-transform:uppercase; color:var(--t2); border-bottom:1px solid var(--b0); white-space:nowrap; }
        .wb-table td { padding:13px 14px; border-bottom:1px solid var(--b0); vertical-align:middle; }
        .wb-table tbody tr:last-child td { border-bottom:none; }
        .wb-table tbody tr { transition:background var(--tr); }
        .wb-table tbody tr:hover td { background:rgba(255,255,255,0.02); }

        /* cells */
        .wb-post-title { font-size:13.5px; font-weight:500; color:var(--t0); }
        .wb-amount { font-family:'Syne',sans-serif; font-size:14px; font-weight:700; color:var(--grn); letter-spacing:-0.01em; }
        .wb-date { font-size:12.5px; color:var(--t2); white-space:nowrap; }

        /* source badges */
        .wb-badge { display:inline-flex; align-items:center; font-size:11.5px; font-weight:500; padding:3px 9px; border-radius:20px; white-space:nowrap; }
        .wb-badge--sub     { background:var(--acc-a);  color:var(--acc-l); }
        .wb-badge--tip     { background:var(--grn-a);  color:var(--grn);   }
        .wb-badge--ad      { background:var(--amb-a);  color:var(--amb);   }
        .wb-badge--bonus   { background:var(--vio-a);  color:var(--vio);   }
        .wb-badge--default { background:rgba(255,255,255,0.06); color:var(--t1); }

        /* loading / empty / error */
        .wb-table-loading { display:flex; align-items:center; justify-content:center; gap:10px; padding:48px 20px; font-size:13.5px; color:var(--t2); }
        .wb-spinner { width:22px; height:22px; border:2.5px solid rgba(255,255,255,0.07); border-top-color:var(--grn); border-radius:50%; animation:wb-spin 0.7s linear infinite; }
        .wb-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:52px 20px; color:var(--t2); text-align:center; }
        .wb-empty p { font-size:14px; font-weight:500; color:var(--t1); }
        .wb-empty span { font-size:12.5px; color:var(--t2); max-width:280px; line-height:1.6; }
        .wb-inline-error { display:flex; align-items:center; gap:9px; padding:12px 16px; background:var(--red-a); border:1px solid rgba(248,113,113,0.18); border-radius:10px; color:#fca5a5; font-size:13px; margin-bottom:4px; }
        .wb-inline-retry { margin-left:auto; background:none; border:none; color:#fca5a5; font-size:12.5px; font-family:var(--font); cursor:pointer; text-decoration:underline; padding:0; white-space:nowrap; }

        /* skeletons */
        @keyframes wb-sk { 0%,100%{opacity:0.35} 50%{opacity:0.65} }
        .wb-sk-card { height:128px; border-radius:16px; background:var(--s1); animation:wb-sk 1.5s ease infinite; }

        /* pagination */
        .wb-pagination { display:flex; align-items:center; gap:6px; justify-content:center; flex-wrap:wrap; margin-top:20px; padding-top:18px; border-top:1px solid var(--b0); }
        .wb-pg-btn { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:8px; border:1px solid var(--b0); background:var(--s0); color:var(--t1); cursor:pointer; transition:all var(--tr); }
        .wb-pg-btn:hover:not(:disabled) { color:var(--t0); border-color:var(--b1); background:var(--s2); }
        .wb-pg-btn:disabled { opacity:0.3; cursor:not-allowed; }
        .wb-pg-numbers { display:flex; align-items:center; gap:4px; }
        .wb-pg-num { width:34px; height:34px; border-radius:8px; border:1px solid var(--b0); background:var(--s0); color:var(--t1); font-family:var(--font); font-size:13px; cursor:pointer; transition:all var(--tr); }
        .wb-pg-num:hover { color:var(--t0); border-color:var(--b1); background:var(--s2); }
        .wb-pg-num--on { background:var(--grn); border-color:var(--grn); color:#042f1e; font-weight:700; }
        .wb-pg-ellipsis { width:34px; text-align:center; color:var(--t2); font-size:13px; }
        .wb-pg-info { font-size:12px; color:var(--t2); margin-left:8px; }

        /* responsive */
        @media(max-width:768px) { .wb-stats-grid { grid-template-columns:1fr 1fr; } .wb-stats-grid > div:last-child { grid-column:span 2; } }
        @media(max-width:540px) {
          .wb-stats-grid { grid-template-columns:1fr; }
          .wb-stats-grid > div:last-child { grid-column:1; }
          .wb-table th:first-child, .wb-table td:first-child { max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
          .wb-card { padding:16px; }
        }
      `}</style>
    </div>
  )
}