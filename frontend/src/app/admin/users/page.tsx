"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import api from "@/lib/axios"

/* ─── types ── */
type User = {
  id: number
  username: string
  email: string
  role: "user" | "editor" | "admin"
  is_banned: boolean
  created_at: string
  total_posts: number
}

type Meta = { page: number; totalPages: number; total: number }
type RoleFilter = "" | "user" | "editor" | "admin"
type ModalState =
  | { type: "none" }
  | { type: "ban";    user: User }
  | { type: "role";   user: User; newRole: User["role"] }
  | { type: "detail"; user: User }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  })
}

const LIMIT = 10
const ROLES: User["role"][] = ["user", "editor", "admin"]

/* ════════════════════════════════════════════════════════════════════════ */
export default function UsersPage() {
  const [users,   setUsers]   = useState<User[]>([])
  const [meta,    setMeta]    = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState(false)
  const [modal,   setModal]   = useState<ModalState>({ type: "none" })
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null)

  const [search,  setSearch]  = useState("")
  const [role,    setRole]    = useState<RoleFilter>("")
  const [page,    setPage]    = useState(1)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── fetch ── */
  const fetchUsers = useCallback(async (pg = 1, q = "", r: RoleFilter = "") => {
    setLoading(true)
    try {
      const res = await api.get("/adminuserRoutes/users", {
        params: { page: pg, limit: LIMIT, search: q, role: r },
      })
      const d = res.data
      setUsers(d.data ?? [])
      setMeta({ page: d.page, totalPages: d.totalPages, total: d.total })
    } catch {
      showToast("Failed to load users.", false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(page, search, role)
  }, [page, role]) // eslint-disable-line

  /* debounced search */
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetchUsers(1, search, role)
    }, 400)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [search]) // eslint-disable-line

  /* ── toast ── */
  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3200)
  }

  /* ── ban / unban ── */
  async function confirmBan() {
    if (modal.type !== "ban") return
    const u = modal.user
    setBusy(true)
    try {
      await api.patch(`/admin/users/${u.id}/ban`, { is_banned: !u.is_banned })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_banned: !x.is_banned } : x))
      setModal({ type: "none" })
      showToast(`${u.username} has been ${!u.is_banned ? "banned" : "unbanned"}.`, true)
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Action failed.", false)
    } finally { setBusy(false) }
  }

  /* ── role change ── */
  async function confirmRole() {
    if (modal.type !== "role") return
    const { user: u, newRole } = modal
    setBusy(true)
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role: newRole })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
      setModal({ type: "none" })
      showToast(`${u.username}'s role changed to ${newRole}.`, true)
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Role update failed.", false)
    } finally { setBusy(false) }
  }

  /* ── derived ── */
  const totalPages   = meta?.totalPages ?? 1
  const activeCount  = users.filter(u => !u.is_banned).length
  const bannedCount  = users.filter(u =>  u.is_banned).length

  /* ── render ── */
  return (
    <div className="us">

      {/* ── Header ── */}
      <div className="us-header">
        <div className="us-header-left">
          <div className="us-eyebrow"><span className="us-dot"/>User Management</div>
          <h1 className="us-title">Users</h1>
          <p className="us-sub">{meta ? `${meta.total} total user${meta.total !== 1 ? "s" : ""}` : "—"}</p>
        </div>
        <button
          className="us-refresh-btn"
          onClick={() => fetchUsers(page, search, role)}
          disabled={loading}
          title="Refresh"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: loading ? "us-spin 0.8s linear infinite" : "none" }}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
          </svg>
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="us-stats">
        {[
          { label: "Total",   value: meta?.total ?? "—", color: "var(--acc)"  },
          { label: "Active",  value: activeCount,         color: "var(--grn)"  },
          { label: "Banned",  value: bannedCount,         color: "var(--red)"  },
          { label: "Showing", value: users.length,        color: "var(--t1)"   },
        ].map(s => (
          <div key={s.label} className="us-stat">
            <span className="us-stat-val" style={{ color: s.color }}>{s.value}</span>
            <span className="us-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="us-toolbar">
        {/* search */}
        <div className="us-search-wrap">
          <svg className="us-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="us-search-inp"
            placeholder="Search by username or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="us-search-clear" onClick={() => { setSearch(""); setPage(1) }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* role filter */}
        <div className="us-filter-tabs">
          {([["", "All"], ["user", "User"], ["editor", "Editor"], ["admin", "Admin"]] as [RoleFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              className={`us-filter-tab ${role === val ? "us-filter-tab--on" : ""}`}
              onClick={() => { setRole(val); setPage(1) }}
            >
              {val && <span className={`us-tab-dot us-tab-dot--${val}`}/>}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="us-table-card">
        {loading ? (
          <div className="us-state-box">
            <div className="us-spinner"/>
            <span>Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <div className="us-state-box">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--t2)", marginBottom: 10 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p style={{ color: "var(--t1)", fontSize: 14 }}>
              {search ? `No users found for "${search}"` : "No users yet."}
            </p>
          </div>
        ) : (
          <table className="us-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Posts</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={u.is_banned ? "us-row--banned" : ""}>
                  {/* user */}
                  <td>
                    <button className="us-user-btn" onClick={() => setModal({ type: "detail", user: u })}>
                      <div className={`us-avatar us-avatar--${u.role}`}>
                        {u.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="us-username">{u.username}</span>
                    </button>
                  </td>
                  {/* email */}
                  <td className="us-email">{u.email}</td>
                  {/* role */}
                  <td>
                    <span className={`us-role-badge us-role-badge--${u.role}`}>
                      {roleIcon(u.role)}
                      {u.role}
                    </span>
                  </td>
                  {/* posts */}
                  <td className="us-posts-count">{Number(u.total_posts ?? 0)}</td>
                  {/* status */}
                  <td>
                    <span className={`us-status-badge ${u.is_banned ? "us-status-badge--banned" : "us-status-badge--active"}`}>
                      <span className="us-status-dot"/>
                      {u.is_banned ? "Banned" : "Active"}
                    </span>
                  </td>
                  {/* joined */}
                  <td className="us-date">{formatDate(u.created_at)}</td>
                  {/* actions */}
                  <td>
                    <div className="us-actions">
                      {/* role select */}
                      <div className="us-role-select-wrap">
                        <svg className="us-role-select-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                        <select
                          className="us-role-select"
                          value={u.role}
                          disabled={busy}
                          onChange={e => {
                            const newRole = e.target.value as User["role"]
                            if (newRole !== u.role) setModal({ type: "role", user: u, newRole })
                          }}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                      </div>
                      {/* ban button */}
                      <button
                        className={`us-btn ${u.is_banned ? "us-btn--unban" : "us-btn--ban"}`}
                        disabled={busy}
                        onClick={() => setModal({ type: "ban", user: u })}
                      >
                        {u.is_banned ? (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Unban
                          </>
                        ) : (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                            </svg>
                            Ban
                          </>
                        )}
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
        <div className="us-pagination">
          <button className="us-pg-btn" disabled={page <= 1} onClick={() => setPage(1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
            </svg>
          </button>
          <button className="us-pg-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="us-pg-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…")
                acc.push(n)
                return acc
              }, [])
              .map((n, i) =>
                n === "…"
                  ? <span key={`e${i}`} className="us-pg-ellipsis">…</span>
                  : <button key={n} className={`us-pg-num ${page === n ? "us-pg-num--on" : ""}`} onClick={() => setPage(n as number)}>{n}</button>
              )}
          </div>
          <button className="us-pg-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button className="us-pg-btn" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
            </svg>
          </button>
          <span className="us-pg-info">{meta?.total ?? 0} total</span>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {modal.type === "detail" && (
        <div className="us-backdrop" onClick={() => setModal({ type: "none" })}>
          <div className="us-modal us-modal--detail" onClick={e => e.stopPropagation()}>
            <button className="us-modal-close" onClick={() => setModal({ type: "none" })}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="us-detail-top">
              <div className={`us-detail-avatar us-avatar--${modal.user.role}`}>
                {modal.user.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="us-detail-name">{modal.user.username}</h3>
                <p className="us-detail-email">{modal.user.email}</p>
              </div>
            </div>
            <div className="us-detail-grid">
              {[
                { label: "Role",        value: modal.user.role   },
                { label: "Posts",       value: String(Number(modal.user.total_posts ?? 0)) },
                { label: "Status",      value: modal.user.is_banned ? "Banned" : "Active" },
                { label: "Joined",      value: formatDate(modal.user.created_at) },
                { label: "User ID",     value: `#${modal.user.id}` },
              ].map(r => (
                <div key={r.label} className="us-detail-row">
                  <span className="us-detail-key">{r.label}</span>
                  <span className="us-detail-val">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="us-detail-actions">
              <button
                className={`us-modal-btn ${modal.user.is_banned ? "us-modal-btn--grn" : "us-modal-btn--red"}`}
                onClick={() => setModal({ type: "ban", user: modal.user })}
              >
                {modal.user.is_banned ? "Unban user" : "Ban user"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ban Modal ── */}
      {modal.type === "ban" && (
        <div className="us-backdrop" onClick={() => !busy && setModal({ type: "none" })}>
          <div className="us-modal" onClick={e => e.stopPropagation()}>
            <div className={`us-modal-icon ${modal.user.is_banned ? "us-modal-icon--grn" : "us-modal-icon--red"}`}>
              {modal.user.is_banned ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              )}
            </div>
            <h3 className="us-modal-title">
              {modal.user.is_banned ? `Unban ${modal.user.username}?` : `Ban ${modal.user.username}?`}
            </h3>
            <p className="us-modal-body">
              {modal.user.is_banned
                ? "This user will regain access to the platform."
                : "This user will lose access to the platform immediately."}
            </p>
            <div className="us-modal-actions">
              <button className="us-modal-btn us-modal-btn--ghost" onClick={() => setModal({ type: "none" })} disabled={busy}>Cancel</button>
              <button
                className={`us-modal-btn ${modal.user.is_banned ? "us-modal-btn--grn" : "us-modal-btn--red"}`}
                onClick={confirmBan}
                disabled={busy}
              >
                {busy
                  ? <><span className="us-btn-spin"/>Working…</>
                  : modal.user.is_banned ? "Unban" : "Ban"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Role Modal ── */}
      {modal.type === "role" && (
        <div className="us-backdrop" onClick={() => !busy && setModal({ type: "none" })}>
          <div className="us-modal" onClick={e => e.stopPropagation()}>
            <div className="us-modal-icon us-modal-icon--acc">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3 className="us-modal-title">Change role?</h3>
            <p className="us-modal-body">
              Change <strong>{modal.user.username}</strong>'s role from{" "}
              <span className={`us-modal-role-chip us-modal-role-chip--${modal.user.role}`}>{modal.user.role}</span>
              {" "}to{" "}
              <span className={`us-modal-role-chip us-modal-role-chip--${modal.newRole}`}>{modal.newRole}</span>
            </p>
            <div className="us-modal-actions">
              <button className="us-modal-btn us-modal-btn--ghost" onClick={() => setModal({ type: "none" })} disabled={busy}>Cancel</button>
              <button className="us-modal-btn us-modal-btn--acc" onClick={confirmRole} disabled={busy}>
                {busy ? <><span className="us-btn-spin"/>Updating…</> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`us-toast ${toast.ok ? "us-toast--ok" : "us-toast--err"}`}>
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
          --vio:#c084fc;--vio-a:rgba(192,132,252,0.12);--vio-b:rgba(192,132,252,0.25);
          --font:'DM Sans',-apple-system,sans-serif;
          --r:10px;--tr:0.16s cubic-bezier(0.4,0,0.2,1);
        }
        .us{display:flex;flex-direction:column;gap:20px;font-family:var(--font);animation:us-in 0.35s ease both;}
        @keyframes us-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes us-spin{to{transform:rotate(360deg)}}

        /* header */
        .us-header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
        .us-header-left{display:flex;flex-direction:column;gap:5px;}
        .us-eyebrow{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:var(--acc);}
        .us-dot{width:6px;height:6px;border-radius:50%;background:var(--acc);box-shadow:0 0 8px rgba(99,102,241,0.5);animation:us-pulse 2.4s ease-in-out infinite;}
        @keyframes us-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.75)}}
        .us-title{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(24px,4vw,32px);color:var(--t0);letter-spacing:-0.025em;line-height:1.1;}
        .us-sub{font-size:13px;color:var(--t1);}
        .us-refresh-btn{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;background:var(--s1);border:1px solid var(--b0);border-radius:var(--r);color:var(--t1);cursor:pointer;transition:color var(--tr),border-color var(--tr);}
        .us-refresh-btn:hover:not(:disabled){color:var(--t0);border-color:var(--b1);}
        .us-refresh-btn:disabled{opacity:0.5;}

        /* stats */
        .us-stats{display:flex;gap:12px;flex-wrap:wrap;}
        .us-stat{display:flex;align-items:center;gap:8px;background:var(--s1);border:1px solid var(--b0);border-radius:var(--r);padding:8px 16px;}
        .us-stat-val{font-size:20px;font-weight:700;font-family:'Syne',sans-serif;}
        .us-stat-label{font-size:12px;color:var(--t2);}

        /* toolbar */
        .us-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
        .us-search-wrap{position:relative;flex:1;min-width:200px;max-width:360px;}
        .us-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--t2);pointer-events:none;}
        .us-search-inp{width:100%;height:38px;padding:0 36px;background:var(--s1);border:1px solid var(--b0);border-radius:var(--r);color:var(--t0);font-family:var(--font);font-size:13.5px;outline:none;transition:border-color var(--tr),box-shadow var(--tr);}
        .us-search-inp:focus{border-color:var(--acc-b);box-shadow:0 0 0 3px var(--acc-a);}
        .us-search-inp::placeholder{color:var(--t2);}
        .us-search-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--t2);cursor:pointer;display:flex;align-items:center;justify-content:center;width:20px;height:20px;}
        .us-search-clear:hover{color:var(--t0);}
        .us-filter-tabs{display:flex;background:var(--s1);border:1px solid var(--b0);border-radius:var(--r);padding:3px;gap:2px;}
        .us-filter-tab{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:8px;border:none;font-family:var(--font);font-size:12.5px;font-weight:500;color:var(--t1);background:transparent;cursor:pointer;transition:background var(--tr),color var(--tr);white-space:nowrap;}
        .us-filter-tab:hover{color:var(--t0);}
        .us-filter-tab--on{background:var(--s0);color:var(--t0);box-shadow:inset 0 0 0 1px var(--b0);}
        .us-tab-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
        .us-tab-dot--user{background:var(--t1);}
        .us-tab-dot--editor{background:var(--amb);}
        .us-tab-dot--admin{background:var(--vio);}

        /* table */
        .us-table-card{background:var(--s1);border:1px solid var(--b0);border-radius:14px;overflow:hidden;}
        .us-state-box{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 24px;gap:8px;color:var(--t1);font-size:14px;}
        .us-spinner{width:26px;height:26px;border:2.5px solid rgba(255,255,255,0.08);border-top-color:var(--acc);border-radius:50%;animation:us-spin 0.7s linear infinite;margin-bottom:4px;}
        .us-table{width:100%;border-collapse:collapse;font-size:13.5px;}
        .us-table th{text-align:left;padding:12px 16px 10px;font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--t2);border-bottom:1px solid var(--b0);}
        .us-table td{padding:13px 16px;border-bottom:1px solid var(--b0);vertical-align:middle;}
        .us-table tbody tr:last-child td{border-bottom:none;}
        .us-table tbody tr{transition:background var(--tr);}
        .us-table tbody tr:hover td{background:rgba(255,255,255,0.02);}
        .us-row--banned td{opacity:0.55;}
        .us-row--banned:hover td{opacity:0.7;}

        /* user cell */
        .us-user-btn{display:flex;align-items:center;gap:9px;background:none;border:none;cursor:pointer;text-align:left;padding:0;font-family:var(--font);}
        .us-user-btn:hover .us-username{color:var(--acc-l);}
        .us-avatar{width:30px;height:30px;border-radius:50%;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .us-avatar--user{background:var(--acc-a);color:var(--acc-l);}
        .us-avatar--editor{background:var(--amb-a);color:var(--amb);}
        .us-avatar--admin{background:var(--vio-a);color:var(--vio);}
        .us-username{font-size:13.5px;font-weight:500;color:var(--t0);transition:color var(--tr);}
        .us-email{font-size:12.5px;color:var(--t1);}
        .us-posts-count{font-size:13px;color:var(--t1);font-family:'Syne',sans-serif;font-weight:700;}
        .us-date{font-size:12px;color:var(--t2);white-space:nowrap;}

        /* role badge */
        .us-role-badge{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500;padding:3px 9px;border-radius:20px;}
        .us-role-badge--user{background:rgba(255,255,255,0.06);color:var(--t1);}
        .us-role-badge--editor{background:var(--amb-a);color:var(--amb);}
        .us-role-badge--admin{background:var(--vio-a);color:var(--vio);}

        /* status badge */
        .us-status-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;padding:4px 10px;border-radius:20px;}
        .us-status-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;}
        .us-status-badge--active{background:var(--grn-a);color:var(--grn);border:1px solid var(--grn-b);}
        .us-status-badge--banned{background:var(--red-a);color:var(--red);border:1px solid var(--red-b);}
        .us-status-badge--active .us-status-dot{animation:us-pulse 2s ease-in-out infinite;}

        /* actions */
        .us-actions{display:flex;align-items:center;gap:7px;}
        .us-role-select-wrap{position:relative;display:flex;align-items:center;}
        .us-role-select-icon{position:absolute;right:8px;color:var(--t2);pointer-events:none;}
        .us-role-select{height:32px;padding:0 24px 0 10px;background:var(--s0);border:1px solid var(--b0);border-radius:7px;color:var(--t0);font-family:var(--font);font-size:12.5px;outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;transition:border-color var(--tr);}
        .us-role-select:hover{border-color:var(--b1);}
        .us-role-select:focus{border-color:var(--acc-b);box-shadow:0 0 0 3px var(--acc-a);}
        .us-role-select option{background:var(--s1);color:var(--t0);}
        .us-role-select:disabled{opacity:0.45;cursor:not-allowed;}
        .us-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:7px;font-family:var(--font);font-size:12px;font-weight:500;border:none;cursor:pointer;transition:background var(--tr),transform var(--tr),opacity var(--tr);white-space:nowrap;}
        .us-btn:disabled{opacity:0.45;cursor:not-allowed;}
        .us-btn:not(:disabled):hover{transform:translateY(-1px);}
        .us-btn--ban{background:var(--red-a);color:var(--red);}
        .us-btn--ban:not(:disabled):hover{background:rgba(248,113,113,0.2);}
        .us-btn--unban{background:var(--grn-a);color:var(--grn);}
        .us-btn--unban:not(:disabled):hover{background:rgba(52,211,153,0.2);}

        /* pagination */
        .us-pagination{display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap;}
        .us-pg-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;border:1px solid var(--b0);background:var(--s1);color:var(--t1);cursor:pointer;transition:all var(--tr);}
        .us-pg-btn:hover:not(:disabled){color:var(--t0);border-color:var(--b1);background:var(--s2);}
        .us-pg-btn:disabled{opacity:0.3;cursor:not-allowed;}
        .us-pg-numbers{display:flex;align-items:center;gap:4px;}
        .us-pg-num{width:34px;height:34px;border-radius:8px;border:1px solid var(--b0);background:var(--s1);color:var(--t1);font-family:var(--font);font-size:13px;cursor:pointer;transition:all var(--tr);}
        .us-pg-num:hover{color:var(--t0);border-color:var(--b1);background:var(--s2);}
        .us-pg-num--on{background:var(--acc);border-color:var(--acc);color:#fff;font-weight:600;}
        .us-pg-ellipsis{width:34px;text-align:center;color:var(--t2);font-size:13px;}
        .us-pg-info{font-size:12px;color:var(--t2);margin-left:8px;}

        /* modals */
        .us-backdrop{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;animation:us-fade-in 0.15s ease both;}
        @keyframes us-fade-in{from{opacity:0}to{opacity:1}}
        .us-modal{background:var(--s2);border:1px solid var(--b1);border-radius:18px;padding:32px 28px 24px;max-width:400px;width:100%;text-align:center;animation:us-slide-up 0.2s cubic-bezier(0.4,0,0.2,1) both;box-shadow:0 24px 80px rgba(0,0,0,0.6);}
        .us-modal--detail{max-width:440px;text-align:left;padding:24px;}
        @keyframes us-slide-up{from{opacity:0;transform:translateY(16px) scale(0.97)}to{opacity:1;transform:none}}
        .us-modal-close{position:absolute;display:flex;align-items:center;justify-content:center;right:18px;top:18px;width:28px;height:28px;border-radius:7px;background:rgba(255,255,255,0.05);border:1px solid var(--b0);color:var(--t1);cursor:pointer;transition:all var(--tr);}
        .us-modal-close:hover{color:var(--t0);border-color:var(--b1);}
        .us-modal--detail{position:relative;}
        .us-modal-icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;}
        .us-modal-icon--grn{background:var(--grn-a);color:var(--grn);}
        .us-modal-icon--red{background:var(--red-a);color:var(--red);}
        .us-modal-icon--acc{background:var(--acc-a);color:var(--acc-l);}
        .us-modal-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:var(--t0);margin-bottom:10px;}
        .us-modal-body{font-size:13.5px;color:var(--t1);line-height:1.6;margin-bottom:24px;}
        .us-modal-body strong{color:var(--t0);font-weight:600;}
        .us-modal-role-chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:12px;font-weight:600;}
        .us-modal-role-chip--user{background:rgba(255,255,255,0.08);color:var(--t0);}
        .us-modal-role-chip--editor{background:var(--amb-a);color:var(--amb);}
        .us-modal-role-chip--admin{background:var(--vio-a);color:var(--vio);}
        .us-modal-actions{display:flex;gap:10px;justify-content:center;}
        .us-modal-btn{flex:1;padding:10px 20px;border-radius:10px;font-family:var(--font);font-size:14px;font-weight:600;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:all var(--tr);}
        .us-modal-btn:disabled{opacity:0.55;cursor:not-allowed;}
        .us-modal-btn:not(:disabled):hover{transform:translateY(-1px);}
        .us-modal-btn--ghost{background:rgba(255,255,255,0.06);color:var(--t1);}
        .us-modal-btn--ghost:not(:disabled):hover{background:rgba(255,255,255,0.1);color:var(--t0);}
        .us-modal-btn--grn{background:var(--grn);color:#042f1e;}
        .us-modal-btn--grn:not(:disabled):hover{background:#2dd4a0;}
        .us-modal-btn--red{background:var(--red);color:#2d0707;}
        .us-modal-btn--red:not(:disabled):hover{background:#fb8080;}
        .us-modal-btn--acc{background:var(--acc);color:#fff;box-shadow:0 4px 16px rgba(99,102,241,0.3);}
        .us-modal-btn--acc:not(:disabled):hover{background:#4f52e8;}
        .us-btn-spin{width:12px;height:12px;border:2px solid rgba(0,0,0,0.2);border-top-color:currentColor;border-radius:50%;animation:us-spin 0.6s linear infinite;flex-shrink:0;}

        /* detail modal */
        .us-detail-top{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid var(--b0);}
        .us-detail-avatar{width:48px;height:48px;border-radius:50%;font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .us-detail-name{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--t0);margin-bottom:3px;}
        .us-detail-email{font-size:13px;color:var(--t1);}
        .us-detail-grid{display:flex;flex-direction:column;gap:0;margin-bottom:20px;}
        .us-detail-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--b0);font-size:13.5px;}
        .us-detail-row:last-child{border-bottom:none;}
        .us-detail-key{color:var(--t2);}
        .us-detail-val{color:var(--t0);font-weight:500;}
        .us-detail-actions{display:flex;gap:10px;}

        /* toast */
        .us-toast{position:fixed;bottom:24px;right:24px;z-index:999;display:flex;align-items:center;gap:9px;padding:12px 18px;border-radius:12px;font-family:var(--font);font-size:13.5px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:us-toast-in 0.25s cubic-bezier(0.4,0,0.2,1) both;max-width:340px;}
        @keyframes us-toast-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .us-toast--ok{background:#0d2e1f;border:1px solid rgba(52,211,153,0.3);color:var(--grn);}
        .us-toast--err{background:#2d0f0f;border:1px solid rgba(248,113,113,0.3);color:var(--red);}

        /* responsive */
        @media(max-width:900px){
          .us-table th:nth-child(4),.us-table td:nth-child(4),
          .us-table th:nth-child(6),.us-table td:nth-child(6){display:none;}
        }
        @media(max-width:640px){
          .us-table th:nth-child(2),.us-table td:nth-child(2){display:none;}
          .us-toolbar{flex-direction:column;align-items:stretch;}
          .us-search-wrap{max-width:100%;}
          .us-filter-tabs{overflow-x:auto;}
          .us-actions{flex-direction:column;}
          .us-btn,.us-role-select{width:100%;}
        }
      `}</style>
    </div>
  )
}

/* ── role icon ── */
function roleIcon(role: string) {
  const s = { width:11, height:11, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:"2.2", strokeLinecap:"round" as const, strokeLinejoin:"round" as const }
  if (role === "admin")  return <svg {...s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  if (role === "editor") return <svg {...s}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  return <svg {...s}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}