"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import api from "@/lib/axios"
import Link from "next/link"

/* ─── types ── */
type Comment = {
  id: number
  content: string
  approved: boolean
  created_at: string
  post_title: string
  slug: string
  username: string
}

type Meta = {
  page: number
  totalPages: number
  total: number
}

type StatusFilter = "" | "approved" | "pending"
type ModalState =
  | { type: "none" }
  | { type: "delete"; comment: Comment }
  | { type: "toggle"; comment: Comment }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  })
}
function truncate(s: string, n = 90) {
  return s.length > n ? s.slice(0, n) + "…" : s
}

const LIMIT = 10

/* ════════════════════════════════════════════════════════════════════════ */
export default function CommentsPage() {
  const [comments,  setComments]  = useState<Comment[]>([])
  const [meta,      setMeta]      = useState<Meta | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [busy,      setBusy]      = useState(false)
  const [modal,     setModal]     = useState<ModalState>({ type: "none" })
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)

  const [search,    setSearch]    = useState("")
  const [status,    setStatus]    = useState<StatusFilter>("")
  const [page,      setPage]      = useState(1)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── fetch ── */
  const fetchComments = useCallback(async (pg = 1, q = "", st: StatusFilter = "") => {
    setLoading(true)
    try {
      const res = await api.get("/comments", {
        params: { page: pg, limit: LIMIT, search: q, status: st },
      })
      const d = res.data
      setComments(d.data ?? [])
      setMeta({ page: d.page, totalPages: d.totalPages, total: d.total })
    } catch {
      showToast("Failed to load comments.", false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchComments(page, search, status)
  }, [page, status]) // eslint-disable-line

  /* debounced search */
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetchComments(1, search, status)
    }, 400)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [search]) // eslint-disable-line

  /* ── toast ── */
  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3200)
  }

  /* ── approve / reject ── */
  async function confirmToggle() {
    if (modal.type !== "toggle") return
    const c = modal.comment
    setBusy(true)
    try {
      await api.patch(`/comments/${c.id}`, { approved: !c.approved })
      setComments(prev => prev.map(x => x.id === c.id ? { ...x, approved: !x.approved } : x))
      setModal({ type: "none" })
      showToast(`Comment ${!c.approved ? "approved" : "rejected"}.`, true)
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Action failed.", false)
    } finally { setBusy(false) }
  }

  /* ── delete ── */
  async function confirmDelete() {
    if (modal.type !== "delete") return
    const c = modal.comment
    setBusy(true)
    try {
      await api.delete(`/comments/${c.id}`)
      setComments(prev => prev.filter(x => x.id !== c.id))
      setModal({ type: "none" })
      showToast("Comment deleted.", true)
      if (comments.length === 1 && page > 1) setPage(p => p - 1)
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Delete failed.", false)
    } finally { setBusy(false) }
  }

  /* ── stats ── */
  const approvedCount = comments.filter(c => c.approved).length
  const pendingCount  = comments.filter(c => !c.approved).length
  const totalPages    = meta?.totalPages ?? 1

  /* ── render ── */
  return (
    <div className="cm">

      {/* ── Header ── */}
      <div className="cm-header">
        <div className="cm-header-left">
          <div className="cm-eyebrow"><span className="cm-dot"/>Moderation</div>
          <h1 className="cm-title">Comments</h1>
          <p className="cm-sub">{meta ? `${meta.total} total comment${meta.total !== 1 ? "s" : ""}` : "—"}</p>
        </div>
        <button
          className="cm-refresh-btn"
          onClick={() => fetchComments(page, search, status)}
          disabled={loading}
          title="Refresh"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: loading ? "cm-spin 0.8s linear infinite" : "none" }}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
          </svg>
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="cm-stats">
        {[
          { label: "Total",    value: meta?.total ?? "—", color: "var(--acc)"  },
          { label: "Approved", value: approvedCount,       color: "var(--grn)"  },
          { label: "Pending",  value: pendingCount,        color: "var(--amb)"  },
          { label: "Page",     value: totalPages > 1 ? `${page} / ${totalPages}` : "1 / 1", color: "var(--t2)" },
        ].map(s => (
          <div key={s.label} className="cm-stat">
            <span className="cm-stat-val" style={{ color: s.color }}>{s.value}</span>
            <span className="cm-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="cm-toolbar">
        {/* search */}
        <div className="cm-search-wrap">
          <svg className="cm-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="cm-search-inp"
            placeholder="Search by user or content…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="cm-search-clear" onClick={() => { setSearch(""); setPage(1) }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* status filter */}
        <div className="cm-filter-tabs">
          {([["", "All"], ["approved", "Approved"], ["pending", "Pending"]] as [StatusFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              className={`cm-filter-tab ${status === val ? "cm-filter-tab--on" : ""}`}
              onClick={() => { setStatus(val); setPage(1) }}
            >
              {val === "approved" && <span className="cm-tab-dot cm-tab-dot--grn"/>}
              {val === "pending"  && <span className="cm-tab-dot cm-tab-dot--amb"/>}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="cm-table-card">
        {loading ? (
          <div className="cm-state-box">
            <div className="cm-spinner"/>
            <span>Loading comments…</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="cm-state-box">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--t2)", marginBottom: 10 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p style={{ color: "var(--t1)", fontSize: 14 }}>
              {search ? `No comments found for "${search}"` : "No comments yet."}
            </p>
          </div>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Comment</th>
                <th>Post</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map(c => (
                <tr key={c.id}>
                  {/* user */}
                  <td>
                    <div className="cm-user">
                      <div className="cm-avatar">{c.username?.[0]?.toUpperCase() ?? "?"}</div>
                      <span className="cm-username">{c.username}</span>
                    </div>
                  </td>
                  {/* comment */}
                  <td>
                    <p className="cm-content">{truncate(c.content)}</p>
                  </td>
                  {/* post */}
                  <td>
                    {c.slug ? (
                      <Link href={`/blog/${c.slug}`} className="cm-post-link" target="_blank">
                        <span className="cm-post-title">{truncate(c.post_title, 40)}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </Link>
                    ) : (
                      <span className="cm-post-title" style={{ color: "var(--t2)" }}>{c.post_title || "—"}</span>
                    )}
                  </td>
                  {/* status */}
                  <td>
                    <span className={`cm-badge ${c.approved ? "cm-badge--approved" : "cm-badge--pending"}`}>
                      <span className="cm-badge-dot"/>
                      {c.approved ? "Approved" : "Pending"}
                    </span>
                  </td>
                  {/* date */}
                  <td className="cm-date">{formatDate(c.created_at)}</td>
                  {/* actions */}
                  <td>
                    <div className="cm-actions">
                      <button
                        className={`cm-btn ${c.approved ? "cm-btn--reject" : "cm-btn--approve"}`}
                        disabled={busy}
                        onClick={() => setModal({ type: "toggle", comment: c })}
                      >
                        {c.approved ? (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            Reject
                          </>
                        ) : (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        className="cm-btn cm-btn--delete"
                        disabled={busy}
                        onClick={() => setModal({ type: "delete", comment: c })}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="cm-pagination">
          <button className="cm-pg-btn" disabled={page <= 1} onClick={() => setPage(1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
            </svg>
          </button>
          <button className="cm-pg-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="cm-pg-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…")
                acc.push(n)
                return acc
              }, [])
              .map((n, i) =>
                n === "…"
                  ? <span key={`e${i}`} className="cm-pg-ellipsis">…</span>
                  : <button key={n} className={`cm-pg-num ${page === n ? "cm-pg-num--on" : ""}`} onClick={() => setPage(n as number)}>{n}</button>
              )}
          </div>
          <button className="cm-pg-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button className="cm-pg-btn" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
            </svg>
          </button>
          <span className="cm-pg-info">{meta?.total ?? 0} total</span>
        </div>
      )}

      {/* ── Toggle Modal ── */}
      {modal.type === "toggle" && (
        <div className="cm-backdrop" onClick={() => !busy && setModal({ type: "none" })}>
          <div className="cm-modal" onClick={e => e.stopPropagation()}>
            <div className={`cm-modal-icon ${modal.comment.approved ? "cm-modal-icon--red" : "cm-modal-icon--grn"}`}>
              {modal.comment.approved ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
            <h3 className="cm-modal-title">
              {modal.comment.approved ? "Reject comment?" : "Approve comment?"}
            </h3>
            <p className="cm-modal-body">
              By <strong>{modal.comment.username}</strong> — "{truncate(modal.comment.content, 80)}"
            </p>
            <div className="cm-modal-actions">
              <button className="cm-modal-btn cm-modal-btn--ghost" onClick={() => setModal({ type: "none" })} disabled={busy}>Cancel</button>
              <button
                className={`cm-modal-btn ${modal.comment.approved ? "cm-modal-btn--red" : "cm-modal-btn--grn"}`}
                onClick={confirmToggle}
                disabled={busy}
              >
                {busy
                  ? <><span className="cm-btn-spin"/>Working…</>
                  : modal.comment.approved ? "Reject" : "Approve"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {modal.type === "delete" && (
        <div className="cm-backdrop" onClick={() => !busy && setModal({ type: "none" })}>
          <div className="cm-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-modal-icon cm-modal-icon--red">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
              </svg>
            </div>
            <h3 className="cm-modal-title">Delete comment?</h3>
            <p className="cm-modal-body">
              By <strong>{modal.comment.username}</strong> — "{truncate(modal.comment.content, 80)}"
              <br/><span style={{ color: "var(--red)", fontSize: 12, marginTop: 6, display: "block" }}>This action cannot be undone.</span>
            </p>
            <div className="cm-modal-actions">
              <button className="cm-modal-btn cm-modal-btn--ghost" onClick={() => setModal({ type: "none" })} disabled={busy}>Cancel</button>
              <button className="cm-modal-btn cm-modal-btn--red" onClick={confirmDelete} disabled={busy}>
                {busy ? <><span className="cm-btn-spin"/>Deleting…</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`cm-toast ${toast.ok ? "cm-toast--ok" : "cm-toast--err"}`}>
          {toast.ok
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          }
          {toast.msg}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --bg:#09090e;--s0:#0f0f17;--s1:#141420;--s2:#1a1a28;
          --b0:rgba(255,255,255,0.06);--b1:rgba(255,255,255,0.11);
          --t0:rgba(255,255,255,0.92);--t1:rgba(255,255,255,0.55);
          --t2:rgba(255,255,255,0.28);--t3:rgba(255,255,255,0.12);
          --acc:#6366f1;--acc-l:#a5b4fc;--acc-a:rgba(99,102,241,0.15);--acc-b:rgba(99,102,241,0.28);
          --grn:#34d399;--grn-a:rgba(52,211,153,0.12);--grn-b:rgba(52,211,153,0.25);
          --amb:#fbbf24;--amb-a:rgba(251,191,36,0.12);--amb-b:rgba(251,191,36,0.25);
          --red:#f87171;--red-a:rgba(248,113,113,0.12);--red-b:rgba(248,113,113,0.25);
          --font:'DM Sans',-apple-system,sans-serif;
          --r:10px;--tr:0.16s cubic-bezier(0.4,0,0.2,1);
        }
        .cm{display:flex;flex-direction:column;gap:20px;font-family:var(--font);animation:cm-in 0.35s ease both;}
        @keyframes cm-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes cm-spin{to{transform:rotate(360deg)}}

        /* header */
        .cm-header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
        .cm-header-left{display:flex;flex-direction:column;gap:5px;}
        .cm-eyebrow{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:var(--acc);}
        .cm-dot{width:6px;height:6px;border-radius:50%;background:var(--acc);box-shadow:0 0 8px rgba(99,102,241,0.5);animation:pulse-dot 2.4s ease-in-out infinite;}
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.75)}}
        .cm-title{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(24px,4vw,32px);color:var(--t0);letter-spacing:-0.025em;line-height:1.1;}
        .cm-sub{font-size:13px;color:var(--t1);}
        .cm-refresh-btn{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;background:var(--s1);border:1px solid var(--b0);border-radius:var(--r);color:var(--t1);cursor:pointer;transition:color var(--tr),border-color var(--tr);}
        .cm-refresh-btn:hover:not(:disabled){color:var(--t0);border-color:var(--b1);}
        .cm-refresh-btn:disabled{opacity:0.5;}

        /* stats */
        .cm-stats{display:flex;gap:12px;flex-wrap:wrap;}
        .cm-stat{display:flex;align-items:center;gap:8px;background:var(--s1);border:1px solid var(--b0);border-radius:var(--r);padding:8px 16px;}
        .cm-stat-val{font-size:20px;font-weight:700;font-family:'Syne',sans-serif;}
        .cm-stat-label{font-size:12px;color:var(--t2);}

        /* toolbar */
        .cm-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
        .cm-search-wrap{position:relative;flex:1;min-width:200px;max-width:360px;}
        .cm-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--t2);pointer-events:none;}
        .cm-search-inp{width:100%;height:38px;padding:0 36px;background:var(--s1);border:1px solid var(--b0);border-radius:var(--r);color:var(--t0);font-family:var(--font);font-size:13.5px;outline:none;transition:border-color var(--tr),box-shadow var(--tr);}
        .cm-search-inp:focus{border-color:var(--acc-b);box-shadow:0 0 0 3px var(--acc-a);}
        .cm-search-inp::placeholder{color:var(--t2);}
        .cm-search-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--t2);cursor:pointer;display:flex;align-items:center;justify-content:center;width:20px;height:20px;}
        .cm-search-clear:hover{color:var(--t0);}
        .cm-filter-tabs{display:flex;background:var(--s1);border:1px solid var(--b0);border-radius:var(--r);padding:3px;gap:2px;}
        .cm-filter-tab{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:8px;border:none;font-family:var(--font);font-size:12.5px;font-weight:500;color:var(--t1);background:transparent;cursor:pointer;transition:background var(--tr),color var(--tr);white-space:nowrap;}
        .cm-filter-tab:hover{color:var(--t0);}
        .cm-filter-tab--on{background:var(--s0);color:var(--t0);box-shadow:inset 0 0 0 1px var(--b0);}
        .cm-tab-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
        .cm-tab-dot--grn{background:var(--grn);}
        .cm-tab-dot--amb{background:var(--amb);}

        /* table card */
        .cm-table-card{background:var(--s1);border:1px solid var(--b0);border-radius:14px;overflow:hidden;}
        .cm-state-box{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 24px;gap:8px;color:var(--t1);font-size:14px;}
        .cm-spinner{width:26px;height:26px;border:2.5px solid rgba(255,255,255,0.08);border-top-color:var(--acc);border-radius:50%;animation:cm-spin 0.7s linear infinite;margin-bottom:4px;}
        .cm-table{width:100%;border-collapse:collapse;font-size:13.5px;}
        .cm-table th{text-align:left;padding:12px 16px 10px;font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--t2);border-bottom:1px solid var(--b0);}
        .cm-table td{padding:13px 16px;border-bottom:1px solid var(--b0);vertical-align:middle;}
        .cm-table tbody tr:last-child td{border-bottom:none;}
        .cm-table tbody tr{transition:background var(--tr);}
        .cm-table tbody tr:hover td{background:rgba(255,255,255,0.02);}

        /* cells */
        .cm-user{display:flex;align-items:center;gap:9px;}
        .cm-avatar{width:28px;height:28px;border-radius:50%;background:var(--acc-a);color:var(--acc-l);font-size:11.5px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .cm-username{font-size:13px;font-weight:500;color:var(--t0);white-space:nowrap;}
        .cm-content{font-size:13px;color:var(--t1);line-height:1.5;max-width:280px;}
        .cm-post-link{display:inline-flex;align-items:center;gap:5px;color:var(--acc-l);font-size:12.5px;text-decoration:none;transition:color var(--tr);}
        .cm-post-link:hover{color:#fff;}
        .cm-post-title{font-size:12.5px;color:var(--t1);}
        .cm-date{font-size:12px;color:var(--t2);white-space:nowrap;}

        /* badges */
        .cm-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;padding:4px 10px;border-radius:20px;}
        .cm-badge-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;}
        .cm-badge--approved{background:var(--grn-a);color:var(--grn);border:1px solid var(--grn-b);}
        .cm-badge--pending{background:var(--amb-a);color:var(--amb);border:1px solid var(--amb-b);}
        .cm-badge--pending .cm-badge-dot{animation:pulse-dot 1.8s ease-in-out infinite;}

        /* action buttons */
        .cm-actions{display:flex;align-items:center;gap:6px;}
        .cm-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:7px;font-family:var(--font);font-size:12px;font-weight:500;border:none;cursor:pointer;transition:background var(--tr),transform var(--tr),opacity var(--tr);white-space:nowrap;}
        .cm-btn:disabled{opacity:0.45;cursor:not-allowed;}
        .cm-btn:not(:disabled):hover{transform:translateY(-1px);}
        .cm-btn--approve{background:var(--grn-a);color:var(--grn);}
        .cm-btn--approve:not(:disabled):hover{background:rgba(52,211,153,0.2);}
        .cm-btn--reject{background:var(--amb-a);color:var(--amb);}
        .cm-btn--reject:not(:disabled):hover{background:rgba(251,191,36,0.2);}
        .cm-btn--delete{background:var(--red-a);color:var(--red);}
        .cm-btn--delete:not(:disabled):hover{background:rgba(248,113,113,0.2);}

        /* pagination */
        .cm-pagination{display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap;}
        .cm-pg-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;border:1px solid var(--b0);background:var(--s1);color:var(--t1);cursor:pointer;transition:all var(--tr);}
        .cm-pg-btn:hover:not(:disabled){color:var(--t0);border-color:var(--b1);background:var(--s2);}
        .cm-pg-btn:disabled{opacity:0.3;cursor:not-allowed;}
        .cm-pg-numbers{display:flex;align-items:center;gap:4px;}
        .cm-pg-num{width:34px;height:34px;border-radius:8px;border:1px solid var(--b0);background:var(--s1);color:var(--t1);font-family:var(--font);font-size:13px;cursor:pointer;transition:all var(--tr);}
        .cm-pg-num:hover{color:var(--t0);border-color:var(--b1);background:var(--s2);}
        .cm-pg-num--on{background:var(--acc);border-color:var(--acc);color:#fff;font-weight:600;}
        .cm-pg-ellipsis{width:34px;text-align:center;color:var(--t2);font-size:13px;}
        .cm-pg-info{font-size:12px;color:var(--t2);margin-left:8px;}

        /* modals */
        .cm-backdrop{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;animation:cm-fade-in 0.15s ease both;}
        @keyframes cm-fade-in{from{opacity:0}to{opacity:1}}
        .cm-modal{background:var(--s2);border:1px solid var(--b1);border-radius:18px;padding:32px 28px 24px;max-width:420px;width:100%;text-align:center;animation:cm-slide-up 0.2s cubic-bezier(0.4,0,0.2,1) both;box-shadow:0 24px 80px rgba(0,0,0,0.6);}
        @keyframes cm-slide-up{from{opacity:0;transform:translateY(16px) scale(0.97)}to{opacity:1;transform:none}}
        .cm-modal-icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;}
        .cm-modal-icon--grn{background:var(--grn-a);color:var(--grn);}
        .cm-modal-icon--red{background:var(--red-a);color:var(--red);}
        .cm-modal-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:var(--t0);margin-bottom:10px;}
        .cm-modal-body{font-size:13.5px;color:var(--t1);line-height:1.6;margin-bottom:24px;}
        .cm-modal-body strong{color:var(--t0);font-weight:600;}
        .cm-modal-actions{display:flex;gap:10px;justify-content:center;}
        .cm-modal-btn{flex:1;padding:10px 20px;border-radius:10px;font-family:var(--font);font-size:14px;font-weight:600;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:all var(--tr);}
        .cm-modal-btn:disabled{opacity:0.55;cursor:not-allowed;}
        .cm-modal-btn:not(:disabled):hover{transform:translateY(-1px);}
        .cm-modal-btn--ghost{background:rgba(255,255,255,0.06);color:var(--t1);}
        .cm-modal-btn--ghost:not(:disabled):hover{background:rgba(255,255,255,0.1);color:var(--t0);}
        .cm-modal-btn--grn{background:var(--grn);color:#042f1e;}
        .cm-modal-btn--grn:not(:disabled):hover{background:#2dd4a0;}
        .cm-modal-btn--red{background:var(--red);color:#2d0707;}
        .cm-modal-btn--red:not(:disabled):hover{background:#fb8080;}
        .cm-btn-spin{width:12px;height:12px;border:2px solid rgba(0,0,0,0.2);border-top-color:currentColor;border-radius:50%;animation:cm-spin 0.6s linear infinite;flex-shrink:0;}

        /* toast */
        .cm-toast{position:fixed;bottom:24px;right:24px;z-index:999;display:flex;align-items:center;gap:9px;padding:12px 18px;border-radius:12px;font-family:var(--font);font-size:13.5px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:cm-toast-in 0.25s cubic-bezier(0.4,0,0.2,1) both;max-width:340px;}
        @keyframes cm-toast-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .cm-toast--ok{background:#0d2e1f;border:1px solid rgba(52,211,153,0.3);color:var(--grn);}
        .cm-toast--err{background:#2d0f0f;border:1px solid rgba(248,113,113,0.3);color:var(--red);}

        /* responsive */
        @media(max-width:768px){
          .cm-table th:nth-child(3),.cm-table td:nth-child(3),
          .cm-table th:nth-child(5),.cm-table td:nth-child(5){display:none;}
          .cm-content{max-width:160px;}
        }
        @media(max-width:600px){
          .cm-toolbar{flex-direction:column;align-items:stretch;}
          .cm-search-wrap{max-width:100%;}
          .cm-actions{flex-direction:column;}
          .cm-btn{width:100%;justify-content:center;}
        }
      `}</style>
    </div>
  )
}