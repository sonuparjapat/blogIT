"use client"

import { useEffect, useState } from "react"
import api from "@/lib/axios"

type Payout = {
  id: number
  amount: number
  status: "pending" | "approved" | "rejected"
  created_at: string
}

function fmt(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN")
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  })
}

export default function PayoutPage() {
  const [amount,    setAmount]    = useState("")
  const [list,      setList]      = useState<Payout[]>([])
  const [loading,   setLoading]   = useState(true)
  const [submitting,setSubmitting]= useState(false)
  const [error,     setError]     = useState("")
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)

  /* ── fetch ── */
  const fetchData = async () => {
    try {
      const res = await api.get("/payout/my")
      setList(Array.isArray(res.data) ? res.data : (res.data?.data ?? []))
    } catch {
      showToast("Failed to load payout history.", false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  /* ── toast ── */
  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  /* ── submit ── */
  async function handleRequest() {
    setError("")
    const val = Number(amount)
    if (!amount.trim() || isNaN(val)) { setError("Please enter a valid amount."); return }
    if (val < 100) { setError("Minimum withdrawal amount is ₹100."); return }
    setSubmitting(true)
    try {
      await api.post("/payout/request", { amount: val })
      setAmount("")
      await fetchData()
      showToast("Withdrawal request submitted successfully.", true)
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Request failed. Please try again.", false)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── derived stats ── */
  const totalApproved = list.filter(i => i.status === "approved").reduce((a, b) => a + Number(b.amount), 0)
  const totalPending  = list.filter(i => i.status === "pending").reduce((a, b) => a + Number(b.amount), 0)
  const totalAll      = list.reduce((a, b) => a + Number(b.amount), 0)

  const sorted = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="pw">

      {/* ── Header ── */}
      <div className="pw-header">
        <div className="pw-eyebrow"><span className="pw-dot"/>Earnings</div>
        <h1 className="pw-title">Payouts</h1>
        <p className="pw-sub">Request withdrawals and track your payout history</p>
      </div>

      {/* ── Stats ── */}
      <div className="pw-stats">
        {[
          { label: "Total requested", value: fmt(totalAll),      color: "var(--acc)"  },
          { label: "Pending",         value: fmt(totalPending),  color: "var(--amb)"  },
          { label: "Approved",        value: fmt(totalApproved), color: "var(--grn)"  },
        ].map(s => (
          <div key={s.label} className="pw-stat">
            <div className="pw-stat-label">{s.label}</div>
            <div className="pw-stat-val" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Request card ── */}
      <div className="pw-card">
        <div className="pw-card-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Request withdrawal
        </div>
        <div className="pw-form">
          <div className="pw-input-wrap">
            <label className="pw-input-label">Amount</label>
            <div className="pw-prefix-wrap">
              <span className="pw-prefix">₹</span>
              <input
                className={`pw-inp ${error ? "pw-inp--err" : ""}`}
                type="number"
                placeholder="0"
                min={100}
                step={1}
                value={amount}
                onChange={e => { setAmount(e.target.value); setError("") }}
                onKeyDown={e => { if (e.key === "Enter") handleRequest() }}
                disabled={submitting}
              />
            </div>
            {error
              ? <div className="pw-field-error">{error}</div>
              : <div className="pw-field-hint">Minimum withdrawal: ₹100 · Press Enter to submit</div>
            }
          </div>
          <button
            className="pw-submit-btn"
            onClick={handleRequest}
            disabled={submitting || !amount.trim()}
          >
            {submitting
              ? <><span className="pw-spin"/>Requesting…</>
              : <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12l7 7 7-7"/>
                  </svg>
                  Withdraw
                </>
            }
          </button>
        </div>
      </div>

      {/* ── History card ── */}
      <div className="pw-card">
        <div className="pw-card-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          History
          {list.length > 0 && <span className="pw-count-badge">{list.length}</span>}
        </div>

        {loading ? (
          <div className="pw-loading">
            <span className="pw-spin"/>Loading history…
          </div>
        ) : sorted.length === 0 ? (
          <div className="pw-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
            <p>No payout requests yet.</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Your withdrawal history will appear here.</p>
          </div>
        ) : (
          <div className="pw-table-wrap">
            <table className="pw-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(i => (
                  <tr key={i.id}>
                    <td className="pw-td-ref">#{i.id}</td>
                    <td className="pw-td-amount">{fmt(i.amount)}</td>
                    <td><StatusBadge status={i.status}/></td>
                    <td className="pw-td-date">{fmtDate(i.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`pw-toast ${toast.ok ? "pw-toast--ok" : "pw-toast--err"}`}>
          {toast.ok
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          }
          {toast.msg}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #09090e; --s0: #0f0f17; --s1: #141420; --s2: #1a1a28;
          --b0: rgba(255,255,255,0.06); --b1: rgba(255,255,255,0.11);
          --t0: rgba(255,255,255,0.92); --t1: rgba(255,255,255,0.55);
          --t2: rgba(255,255,255,0.28); --t3: rgba(255,255,255,0.12);
          --acc: #6366f1; --acc-l: #a5b4fc; --acc-a: rgba(99,102,241,0.15); --acc-b: rgba(99,102,241,0.28);
          --grn: #34d399; --grn-a: rgba(52,211,153,0.12); --grn-b: rgba(52,211,153,0.25);
          --amb: #fbbf24; --amb-a: rgba(251,191,36,0.12); --amb-b: rgba(251,191,36,0.25);
          --red: #f87171; --red-a: rgba(248,113,113,0.12); --red-b: rgba(248,113,113,0.25);
          --font: 'DM Sans', -apple-system, sans-serif;
          --r: 10px; --t: 0.16s cubic-bezier(0.4,0,0.2,1);
        }

        .pw {
          font-family: var(--font);
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-bottom: 60px;
          animation: pw-in 0.35s ease both;
        }
        @keyframes pw-in { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        @keyframes spin { to { transform: rotate(360deg) } }

        /* ── header ── */
        .pw-header { display: flex; flex-direction: column; gap: 6px; }
        .pw-eyebrow { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--acc); }
        .pw-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--acc); box-shadow: 0 0 8px rgba(99,102,241,0.5); animation: pulse-dot 2.4s ease-in-out infinite; }
        @keyframes pulse-dot { 0%,100% { opacity:1;transform:scale(1) } 50% { opacity:0.5;transform:scale(0.75) } }
        .pw-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(24px,4vw,32px); color: var(--t0); letter-spacing: -0.025em; }
        .pw-sub { font-size: 13.5px; color: var(--t1); }

        /* ── stats ── */
        .pw-stats { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; }
        .pw-stat { background: var(--s1); border: 1px solid var(--b0); border-radius: var(--r); padding: 16px 18px; }
        .pw-stat-label { font-size: 11.5px; color: var(--t2); margin-bottom: 8px; font-weight: 500; }
        .pw-stat-val { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }

        /* ── card ── */
        .pw-card { background: var(--s0); border: 1px solid var(--b0); border-radius: 14px; padding: 22px 24px; }
        .pw-card-title { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--t1); margin-bottom: 18px; }
        .pw-count-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; border-radius: 9px; background: var(--acc-a); color: var(--acc-l); font-size: 11px; font-weight: 600; padding: 0 5px; }

        /* ── form ── */
        .pw-form { display: flex; gap: 12px; align-items: flex-end; }
        .pw-input-wrap { flex: 1; }
        .pw-input-label { display: block; font-size: 11.5px; color: var(--t1); font-weight: 500; margin-bottom: 7px; }
        .pw-prefix-wrap { position: relative; display: flex; align-items: center; }
        .pw-prefix { position: absolute; left: 12px; font-size: 14px; color: var(--t1); pointer-events: none; z-index: 1; }
        .pw-inp { width: 100%; height: 40px; padding: 0 14px 0 28px; background: var(--s1); border: 1px solid var(--b0); border-radius: var(--r); color: var(--t0); font-family: var(--font); font-size: 14px; outline: none; transition: border-color var(--t), box-shadow var(--t); }
        .pw-inp:focus { border-color: var(--acc-b); box-shadow: 0 0 0 3px var(--acc-a); }
        .pw-inp::placeholder { color: var(--t3); }
        .pw-inp--err { border-color: var(--red-b); }
        .pw-inp--err:focus { box-shadow: 0 0 0 3px var(--red-a); }
        .pw-inp:disabled { opacity: 0.5; cursor: not-allowed; }
        .pw-field-hint { font-size: 11.5px; color: var(--t2); margin-top: 7px; }
        .pw-field-error { font-size: 11.5px; color: var(--red); margin-top: 7px; }
        .pw-submit-btn { display: inline-flex; align-items: center; gap: 7px; height: 40px; padding: 0 22px; background: var(--acc); color: #fff; border: none; border-radius: var(--r); font-family: var(--font); font-size: 13.5px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; box-shadow: 0 4px 16px rgba(99,102,241,0.35); transition: background var(--t), transform var(--t), opacity var(--t); }
        .pw-submit-btn:hover:not(:disabled) { background: #4f52e8; transform: translateY(-1px); }
        .pw-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* ── table ── */
        .pw-table-wrap { overflow-x: auto; }
        .pw-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        .pw-table th { text-align: left; padding: 0 14px 10px; font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--t2); border-bottom: 1px solid var(--b0); }
        .pw-table td { padding: 13px 14px; border-bottom: 1px solid var(--b0); }
        .pw-table tr:last-child td { border-bottom: none; }
        .pw-table tbody tr { transition: background var(--t); }
        .pw-table tbody tr:hover td { background: rgba(255,255,255,0.025); }
        .pw-td-ref { color: var(--t2); font-family: monospace; font-size: 12px; }
        .pw-td-amount { color: var(--t0); font-weight: 600; font-family: 'Syne', sans-serif; font-size: 15px; }
        .pw-td-date { color: var(--t2); white-space: nowrap; }

        /* ── status badge ── */
        .pw-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 20px; }
        .pw-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .pw-badge--pending  { background: var(--amb-a); color: var(--amb); border: 1px solid var(--amb-b); }
        .pw-badge--approved { background: var(--grn-a); color: var(--grn); border: 1px solid var(--grn-b); }
        .pw-badge--rejected { background: var(--red-a); color: var(--red); border: 1px solid var(--red-b); }
        .pw-badge--pending .pw-badge-dot { animation: pulse-dot 1.8s ease-in-out infinite; }

        /* ── empty / loading ── */
        .pw-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px 20px; font-size: 13.5px; color: var(--t2); }
        .pw-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 20px; color: var(--t2); font-size: 13.5px; text-align: center; }

        /* ── spinner ── */
        .pw-spin { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.2); border-top-color: currentColor; border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0; }

        /* ── toast ── */
        .pw-toast { position: fixed; bottom: 24px; right: 24px; z-index: 999; display: flex; align-items: center; gap: 9px; padding: 11px 18px; border-radius: 12px; font-family: var(--font); font-size: 13.5px; font-weight: 500; box-shadow: 0 8px 32px rgba(0,0,0,0.4); animation: toast-in 0.25s cubic-bezier(0.4,0,0.2,1) both; max-width: 340px; }
        @keyframes toast-in { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        .pw-toast--ok  { background: #0d2e1f; border: 1px solid rgba(52,211,153,0.3);  color: var(--grn); }
        .pw-toast--err { background: #2d0f0f; border: 1px solid rgba(248,113,113,0.3); color: var(--red); }

        /* ── responsive ── */
        @media (max-width: 600px) {
          .pw-stats { grid-template-columns: 1fr 1fr; }
          .pw-stats > div:last-child { grid-column: span 2; }
          .pw-form { flex-direction: column; align-items: stretch; }
          .pw-submit-btn { width: 100%; justify-content: center; }
          .pw-card { padding: 18px 16px; }
        }
      `}</style>
    </div>
  )
}

/* ── Status badge sub-component ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  "pw-badge--pending",
    approved: "pw-badge--approved",
    rejected: "pw-badge--rejected",
  }
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`pw-badge ${map[status] ?? "pw-badge--pending"}`}>
      <span className="pw-badge-dot"/>
      {label}
    </span>
  )
}