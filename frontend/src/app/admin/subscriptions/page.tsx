"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import api from "@/lib/axios"
import DataTable from "@/components/admin/DataTable"
import StatusBadge from "@/components/admin/StatusBadge"

/* ─── types ─────────────────────────────────────────────────────────────── */
type Subscription = {
  id: number
  user_id: number
  username: string
  email: string
  plan: "monthly" | "yearly"
  started_at: string
  expires_at: string
  status: "active" | "expired" | "cancelled"
  amount: number
  razorpay_payment_id?: string
}

type Stats = {
  total: number
  active: number
  expired: number
  monthly: number
  yearly: number
  revenue: number
}

type Meta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

type ModalState =
  | { type: "none" }
  | { type: "revoke"; sub: Subscription }
  | { type: "extend"; sub: Subscription }
  | { type: "detail"; sub: Subscription }

type PlanFilter = "all" | "monthly" | "yearly"
type StatusFilter = "all" | "active" | "expired" | "cancelled"
type SortKey = "expires_at" | "started_at" | "amount" | "username"
type SortDir = "asc" | "desc"

const LIMIT = 10

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function formatCurrency(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`
}
function daysLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  const d = Math.ceil(diff / 86400000)
  return d
}
function isExpiringSoon(iso: string) {
  const d = daysLeft(iso)
  return d > 0 && d <= 7
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function SubscriptionsPage() {
  const [subs,        setSubs]        = useState<Subscription[]>([])
  const [stats,       setStats]       = useState<Stats | null>(null)
  const [meta,        setMeta]        = useState<Meta | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [statsLoading,setStatsLoading]= useState(true)
  const [modal,       setModal]       = useState<ModalState>({ type: "none" })
  const [busy,        setBusy]        = useState(false)
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null)
  const [extendMonths,setExtendMonths]= useState(1)

  /* filters */
  const [search,       setSearch]       = useState("")
  const [planFilter,   setPlanFilter]   = useState<PlanFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [page,         setPage]         = useState(1)
  const [sortKey,      setSortKey]      = useState<SortKey>("expires_at")
  const [sortDir,      setSortDir]      = useState<SortDir>("asc")

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── fetch stats ── */
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await api.get("/subscriptions/stats")
      setStats(res.data?.data ?? res.data)
    } catch {
      // silently fail – stats are supplementary
    } finally {
      setStatsLoading(false)
    }
  }, [])

  /* ── fetch subscriptions ── */
  const fetchSubs = useCallback(async (
    pg    = 1,
    q     = "",
    plan  : PlanFilter   = "all",
    status: StatusFilter = "active",
    sk    : SortKey      = "expires_at",
    sd    : SortDir      = "asc",
  ) => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page: pg, limit: LIMIT, sort: sk, dir: sd }
      if (q.trim())      params.q      = q.trim()
      if (plan !== "all")   params.plan   = plan
      if (status !== "all") params.status = status
      const res = await api.get("/subscriptions", { params })
      const raw = res.data
      setSubs(Array.isArray(raw) ? raw : (raw?.data ?? []))
      setMeta(raw?.meta ?? null)
    } catch {
      showToast("Failed to load subscriptions.", false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchSubs(page, search, planFilter, statusFilter, sortKey, sortDir)
  }, [page, planFilter, statusFilter, sortKey, sortDir])

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetchSubs(1, search, planFilter, statusFilter, sortKey, sortDir)
    }, 400)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [search])

  /* ── toast ── */
  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── sort toggle ── */
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
    setPage(1)
  }

  /* ── revoke subscription ── */
  async function confirmRevoke() {
    if (modal.type !== "revoke") return
    const sub = modal.sub
    setBusy(true)
    try {
      await api.delete(`/subscriptions/${sub.user_id}`)
      setSubs(prev => prev.map(s => s.user_id === sub.user_id ? { ...s, status: "cancelled" } : s))
      setModal({ type: "none" })
      showToast(`Subscription for ${sub.username} revoked.`, true)
      fetchStats()
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Revoke failed.", false)
    } finally { setBusy(false) }
  }

  /* ── extend subscription ── */
  async function confirmExtend() {
    if (modal.type !== "extend") return
    const sub = modal.sub
    setBusy(true)
    try {
      await api.patch(`/subscriptions/${sub.user_id}/extend`, { months: extendMonths })
      setModal({ type: "none" })
      showToast(`Extended ${sub.username}'s subscription by ${extendMonths}m.`, true)
      fetchSubs(page, search, planFilter, statusFilter, sortKey, sortDir)
      fetchStats()
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Extend failed.", false)
    } finally { setBusy(false) }
  }

  /* ── export CSV ── */
  async function exportCSV() {
    try {
      const res = await api.get("/subscriptions/export", { responseType: "blob" })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement("a")
      a.href = url
      a.download = `subscriptions-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast("Export started.", true)
    } catch {
      showToast("Export failed.", false)
    }
  }

  /* ── clear filters ── */
  function clearFilters() {
    setPlanFilter("all"); setStatusFilter("active"); setPage(1)
  }

  const totalPages    = meta?.totalPages ?? 1
  const activeFilters = (planFilter !== "all" ? 1 : 0) + (statusFilter !== "active" ? 1 : 0)

  /* ── columns ── */
  const columns = [
    {
      label: "User", key: "username",
      render: (row: Subscription) => (
        <div className="col-user">
          <div className="col-avatar" data-plan={row.plan}>
            {row.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="col-user-info">
            <span className="col-user-name">{row.username}</span>
            <span className="col-user-email">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      label: "Plan", key: "plan",
      render: (row: Subscription) => (
        <span className={`plan-badge plan-badge--${row.plan}`}>
          {row.plan === "yearly" ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          )}
          {row.plan}
        </span>
      ),
    },
    {
      label: "Status", key: "status",
      render: (row: Subscription) => <StatusBadge status={row.status} />,
    },
    {
      label: (
        <button className="sort-btn" onClick={() => toggleSort("started_at")}>
          Started {sortKey === "started_at" && <SortArrow dir={sortDir} />}
        </button>
      ),
      key: "started_at",
      render: (row: Subscription) => <span className="col-date">{formatDate(row.started_at)}</span>,
    },
    {
      label: (
        <button className="sort-btn" onClick={() => toggleSort("expires_at")}>
          Expires {sortKey === "expires_at" && <SortArrow dir={sortDir} />}
        </button>
      ),
      key: "expires_at",
      render: (row: Subscription) => {
        const d = daysLeft(row.expires_at)
        const soon = isExpiringSoon(row.expires_at)
        return (
          <div className="col-expiry">
            <span className="col-date">{formatDate(row.expires_at)}</span>
            {row.status === "active" && d > 0 && (
              <span className={`expiry-tag ${soon ? "expiry-tag--soon" : "expiry-tag--ok"}`}>
                {soon ? "⚠ " : ""}{d}d left
              </span>
            )}
            {row.status === "active" && d <= 0 && (
              <span className="expiry-tag expiry-tag--expired">Expired</span>
            )}
          </div>
        )
      },
    },
    {
      label: (
        <button className="sort-btn" onClick={() => toggleSort("amount")}>
          Amount {sortKey === "amount" && <SortArrow dir={sortDir} />}
        </button>
      ),
      key: "amount",
      render: (row: Subscription) => (
        <span className="col-amount">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      label: "Actions", key: "actions",
      render: (row: Subscription) => (
        <div className="action-group">
          <button
            className="btn-action btn-detail"
            onClick={() => setModal({ type: "detail", sub: row })}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Details
          </button>
          {row.status !== "cancelled" && (
            <button
              className="btn-action btn-extend"
              disabled={busy}
              onClick={() => { setExtendMonths(1); setModal({ type: "extend", sub: row }) }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Extend
            </button>
          )}
          {row.status === "active" && (
            <button
              className="btn-action btn-revoke"
              disabled={busy}
              onClick={() => setModal({ type: "revoke", sub: row })}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              Revoke
            </button>
          )}
        </div>
      ),
    },
  ]

  /* ── render ── */
  return (
    <div className="subs-page">

      {/* ── Header ── */}
      <div className="page-header">
        <div className="header-left">
          <div className="page-eyebrow"><span className="eyebrow-dot"/>Monetization</div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-sub">{meta ? `${meta.total} total entr${meta.total === 1 ? "y" : "ies"}` : "—"}</p>
        </div>
        <div className="header-actions">
          <button
            className="export-btn"
            onClick={exportCSV}
            title="Export CSV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button
            className="refresh-btn"
            onClick={() => { fetchSubs(page, search, planFilter, statusFilter, sortKey, sortDir); fetchStats() }}
            disabled={loading}
            title="Refresh"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}>
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="stats-grid">
        <StatCard
          label="Total Subs"
          value={statsLoading ? "—" : stats?.total ?? 0}
          color="var(--accent)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label="Active"
          value={statsLoading ? "—" : stats?.active ?? 0}
          color="var(--green)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        />
        <StatCard
          label="Expired"
          value={statsLoading ? "—" : stats?.expired ?? 0}
          color="var(--red)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
        />
        <StatCard
          label="Yearly Subs"
          value={statsLoading ? "—" : stats?.yearly ?? 0}
          color="var(--amber)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
        />
        <StatCard
          label="Total Revenue"
          value={statsLoading ? "—" : stats ? formatCurrency(stats.revenue) : "₹0"}
          color="var(--teal)"
          wide
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="toolbar">
        {/* Search */}
        <div className="search-wrap">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-inp"
            placeholder="Search by username or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => { setSearch(""); setPage(1) }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="filter-tabs">
          {(["active", "expired", "cancelled", "all"] as StatusFilter[]).map(s => (
            <button
              key={s}
              className={`filter-tab ${statusFilter === s ? "filter-tab--on" : ""}`}
              onClick={() => { setStatusFilter(s); setPage(1) }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Plan filter */}
        <div className="filter-tabs">
          {(["all", "monthly", "yearly"] as PlanFilter[]).map(p => (
            <button
              key={p}
              className={`filter-tab ${planFilter === p ? "filter-tab--on" : ""}`}
              onClick={() => { setPlanFilter(p); setPage(1) }}
            >
              {p === "all" ? "All Plans" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {activeFilters > 0 && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Clear ({activeFilters})
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"/>
            <span>Loading subscriptions…</span>
          </div>
        ) : subs.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", marginBottom: 12 }}>
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              {search ? `No results for "${search}"` : "No subscriptions found."}
            </p>
            {activeFilters > 0 && (
              <button className="create-btn" onClick={clearFilters} style={{ marginTop: 16 }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <DataTable columns={columns} data={subs} />
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button className="pg-btn" disabled={page <= 1} onClick={() => setPage(1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
          </button>
          <button className="pg-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="pg-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…")
                acc.push(n)
                return acc
              }, [])
              .map((n, i) =>
                n === "…"
                  ? <span key={`e${i}`} className="pg-ellipsis">…</span>
                  : <button key={n} className={`pg-num ${page === n ? "pg-num--on" : ""}`} onClick={() => setPage(n as number)}>{n}</button>
              )}
          </div>
          <button className="pg-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="pg-btn" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
          </button>
          <span className="pg-info">{meta?.total ?? 0} total</span>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {modal.type === "detail" && (
        <div className="modal-backdrop" onClick={() => setModal({ type: "none" })}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <div className="modal-detail-header">
              <div className="col-avatar col-avatar--lg" data-plan={modal.sub.plan}>
                {modal.sub.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="modal-title" style={{ textAlign: "left", marginBottom: 2 }}>{modal.sub.username}</h3>
                <p style={{ color: "var(--muted)", fontSize: 13 }}>{modal.sub.email}</p>
              </div>
              <button className="modal-close" onClick={() => setModal({ type: "none" })}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="detail-grid">
              <DetailRow label="Plan" value={<span className={`plan-badge plan-badge--${modal.sub.plan}`}>{modal.sub.plan}</span>} />
              <DetailRow label="Status" value={<StatusBadge status={modal.sub.status} />} />
              <DetailRow label="Amount Paid" value={formatCurrency(modal.sub.amount)} />
              <DetailRow label="Started" value={formatDate(modal.sub.started_at)} />
              <DetailRow label="Expires" value={formatDate(modal.sub.expires_at)} />
              {modal.sub.status === "active" && (
                <DetailRow
                  label="Days Remaining"
                  value={
                    <span style={{ color: isExpiringSoon(modal.sub.expires_at) ? "var(--amber)" : "var(--green)" }}>
                      {Math.max(0, daysLeft(modal.sub.expires_at))} days
                    </span>
                  }
                />
              )}
              {modal.sub.razorpay_payment_id && (
                <DetailRow label="Payment ID" value={<code style={{ fontSize: 11, color: "var(--muted)" }}>{modal.sub.razorpay_payment_id}</code>} />
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: 24 }}>
              {modal.sub.status !== "cancelled" && (
                <button className="modal-btn modal-btn--green" onClick={() => { setExtendMonths(1); setModal({ type: "extend", sub: modal.sub }) }}>Extend</button>
              )}
              {modal.sub.status === "active" && (
                <button className="modal-btn modal-btn--red" onClick={() => setModal({ type: "revoke", sub: modal.sub })}>Revoke</button>
              )}
              <button className="modal-btn modal-btn--ghost" onClick={() => setModal({ type: "none" })}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Revoke Modal ── */}
      {modal.type === "revoke" && (
        <div className="modal-backdrop" onClick={() => !busy && setModal({ type: "none" })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon modal-icon--red">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
            </div>
            <h3 className="modal-title">Revoke subscription?</h3>
            <p className="modal-body"><strong>{modal.sub.username}</strong>'s active subscription will be cancelled immediately.</p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn--ghost" onClick={() => setModal({ type: "none" })} disabled={busy}>Cancel</button>
              <button className="modal-btn modal-btn--red" onClick={confirmRevoke} disabled={busy}>
                {busy ? <><span className="btn-spin"/>Revoking…</> : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Extend Modal ── */}
      {modal.type === "extend" && (
        <div className="modal-backdrop" onClick={() => !busy && setModal({ type: "none" })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon modal-icon--green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h3 className="modal-title">Extend subscription</h3>
            <p className="modal-body">Extend <strong>{modal.sub.username}</strong>'s subscription by:</p>
            <div className="extend-picker">
              {[1, 3, 6, 12].map(m => (
                <button
                  key={m}
                  className={`extend-option ${extendMonths === m ? "extend-option--on" : ""}`}
                  onClick={() => setExtendMonths(m)}
                >
                  {m === 12 ? "1 yr" : `${m}mo`}
                </button>
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="modal-btn modal-btn--ghost" onClick={() => setModal({ type: "none" })} disabled={busy}>Cancel</button>
              <button className="modal-btn modal-btn--green" onClick={confirmExtend} disabled={busy}>
                {busy ? <><span className="btn-spin"/>Extending…</> : `Extend +${extendMonths}mo`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast ${toast.ok ? "toast--ok" : "toast--err"}`}>
          {toast.ok
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* ── Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --bg:#0a0a0f;--surface:#111118;--elevated:#16161f;
          --border:rgba(255,255,255,0.07);--border-hover:rgba(255,255,255,0.13);
          --text:rgba(255,255,255,0.90);--muted:rgba(255,255,255,0.38);
          --accent:#6366f1;--accent-dim:rgba(99,102,241,0.15);--accent-glow:rgba(99,102,241,0.3);
          --green:#34d399;--green-dim:rgba(52,211,153,0.12);
          --amber:#fbbf24;--amber-dim:rgba(251,191,36,0.12);
          --red:#f87171;--red-dim:rgba(248,113,113,0.12);
          --teal:#2dd4bf;--teal-dim:rgba(45,212,191,0.12);
          --font:'DM Sans',-apple-system,sans-serif;--radius:12px;
          --t:0.18s cubic-bezier(0.4,0,0.2,1);
        }
        .subs-page{display:flex;flex-direction:column;gap:20px;font-family:var(--font);animation:page-in 0.4s cubic-bezier(0.4,0,0.2,1) both;}
        @keyframes page-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}

        /* header */
        .page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}
        .header-left{display:flex;flex-direction:column;gap:6px;}
        .header-actions{display:flex;align-items:center;gap:10px;}
        .page-eyebrow{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);}
        .eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent-glow);animation:pulse-dot 2.4s ease-in-out infinite;}
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.75)}}
        .page-title{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(26px,4vw,34px);color:var(--text);letter-spacing:-0.02em;line-height:1.1;}
        .page-sub{font-size:13px;color:var(--muted);}
        .refresh-btn{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);color:var(--muted);cursor:pointer;transition:color var(--t),border-color var(--t);}
        .refresh-btn:hover:not(:disabled){color:var(--text);border-color:var(--border-hover);}
        .refresh-btn:disabled{opacity:0.5;}
        .export-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);color:var(--muted);font-family:var(--font);font-size:13px;font-weight:500;cursor:pointer;transition:all var(--t);}
        .export-btn:hover{color:var(--text);border-color:var(--border-hover);}
        .create-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:var(--accent);color:#fff;border-radius:var(--radius);font-family:var(--font);font-size:14px;font-weight:500;text-decoration:none;white-space:nowrap;box-shadow:0 4px 20px rgba(99,102,241,0.35);transition:background var(--t),transform var(--t);border:none;cursor:pointer;}
        .create-btn:hover{background:#4f52e8;transform:translateY(-1px);}

        /* stats grid */
        .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;}
        .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 16px;display:flex;flex-direction:column;gap:12px;transition:border-color var(--t);}
        .stat-card:hover{border-color:var(--border-hover);}
        .stat-card--wide{grid-column:span 2;}
        .stat-card-top{display:flex;align-items:center;justify-content:space-between;}
        .stat-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;}
        .stat-val{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;}
        .stat-label{font-size:12px;color:var(--muted);font-weight:500;}

        /* toolbar */
        .toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
        .search-wrap{position:relative;flex:1;min-width:200px;max-width:340px;}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;}
        .search-inp{width:100%;height:38px;padding:0 36px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font);font-size:13.5px;outline:none;transition:border-color var(--t),box-shadow var(--t);}
        .search-inp:focus{border-color:rgba(99,102,241,0.5);box-shadow:0 0 0 3px rgba(99,102,241,0.1);}
        .search-inp::placeholder{color:var(--muted);}
        .search-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;width:20px;height:20px;}
        .search-clear:hover{color:var(--text);}
        .filter-tabs{display:flex;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:3px;gap:2px;}
        .filter-tab{padding:5px 13px;border-radius:8px;border:none;font-family:var(--font);font-size:12.5px;font-weight:500;color:var(--muted);background:transparent;cursor:pointer;transition:background var(--t),color var(--t);white-space:nowrap;}
        .filter-tab:hover{color:var(--text);}
        .filter-tab--on{background:var(--elevated);color:var(--text);box-shadow:inset 0 0 0 1px var(--border);}
        .clear-filters-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.22);border-radius:10px;color:var(--accent);font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer;transition:background var(--t);}
        .clear-filters-btn:hover{background:rgba(99,102,241,0.18);}

        /* sort button */
        .sort-btn{background:none;border:none;color:inherit;font-family:var(--font);font-size:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-weight:600;}

        /* table */
        .table-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;}
        .loading-state,.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 24px;gap:10px;color:var(--muted);font-size:14px;}
        .loading-spinner{width:28px;height:28px;border:2.5px solid rgba(255,255,255,0.1);border-top-color:var(--accent);border-radius:50%;animation:spin 0.7s linear infinite;margin-bottom:4px;}

        /* column cells */
        .col-user{display:flex;align-items:center;gap:10px;}
        .col-avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;}
        .col-avatar--lg{width:44px;height:44px;font-size:16px;}
        .col-avatar[data-plan="yearly"]{background:rgba(251,191,36,0.15);color:var(--amber);}
        .col-avatar[data-plan="monthly"]{background:var(--accent-dim);color:var(--accent);}
        .col-user-info{display:flex;flex-direction:column;gap:2px;}
        .col-user-name{font-size:13.5px;font-weight:500;color:var(--text);}
        .col-user-email{font-size:11px;color:var(--muted);}
        .col-date{font-size:12.5px;color:var(--muted);white-space:nowrap;}
        .col-expiry{display:flex;flex-direction:column;gap:3px;}
        .col-amount{font-size:13px;font-weight:600;color:var(--teal);}

        /* plan badges */
        .plan-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:11.5px;font-weight:600;text-transform:capitalize;}
        .plan-badge--yearly{background:rgba(251,191,36,0.12);color:var(--amber);border:1px solid rgba(251,191,36,0.22);}
        .plan-badge--monthly{background:var(--accent-dim);color:var(--accent);border:1px solid rgba(99,102,241,0.22);}

        /* expiry tags */
        .expiry-tag{font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:4px;}
        .expiry-tag--ok{background:var(--green-dim);color:var(--green);}
        .expiry-tag--soon{background:var(--amber-dim);color:var(--amber);}
        .expiry-tag--expired{background:var(--red-dim);color:var(--red);}

        /* actions */
        .action-group{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
        .btn-action{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:7px;font-family:var(--font);font-size:12px;font-weight:500;border:none;cursor:pointer;text-decoration:none;transition:background var(--t),transform var(--t),opacity var(--t);white-space:nowrap;}
        .btn-action:disabled{opacity:0.45;cursor:not-allowed;}
        .btn-action:not(:disabled):hover{transform:translateY(-1px);}
        .btn-detail{background:rgba(255,255,255,0.06);color:var(--muted);}
        .btn-detail:not(:disabled):hover{background:rgba(255,255,255,0.1);color:var(--text);}
        .btn-extend{background:var(--green-dim);color:var(--green);}
        .btn-extend:not(:disabled):hover{background:rgba(52,211,153,0.2);}
        .btn-revoke{background:var(--red-dim);color:var(--red);}
        .btn-revoke:not(:disabled):hover{background:rgba(248,113,113,0.2);}

        /* pagination */
        .pagination{display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap;}
        .pg-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--muted);cursor:pointer;transition:all var(--t);}
        .pg-btn:hover:not(:disabled){color:var(--text);border-color:var(--border-hover);background:var(--elevated);}
        .pg-btn:disabled{opacity:0.3;cursor:not-allowed;}
        .pg-numbers{display:flex;align-items:center;gap:4px;}
        .pg-num{width:34px;height:34px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--muted);font-family:var(--font);font-size:13px;cursor:pointer;transition:all var(--t);}
        .pg-num:hover{color:var(--text);border-color:var(--border-hover);background:var(--elevated);}
        .pg-num--on{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600;}
        .pg-ellipsis{width:34px;text-align:center;color:var(--muted);font-size:13px;}
        .pg-info{font-size:12px;color:var(--muted);margin-left:8px;}

        /* modals */
        .modal-backdrop{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fade-in 0.15s ease both;}
        @keyframes fade-in{from{opacity:0}to{opacity:1}}
        .modal{background:var(--elevated);border:1px solid var(--border-hover);border-radius:18px;padding:32px 28px 24px;max-width:400px;width:100%;text-align:center;animation:slide-up 0.2s cubic-bezier(0.4,0,0.2,1) both;box-shadow:0 24px 80px rgba(0,0,0,0.6);}
        .modal--wide{max-width:480px;text-align:left;}
        @keyframes slide-up{from{opacity:0;transform:translateY(16px) scale(0.97)}to{opacity:1;transform:none}}
        .modal-detail-header{display:flex;align-items:center;gap:14px;margin-bottom:24px;position:relative;}
        .modal-close{position:absolute;right:0;top:0;background:none;border:none;color:var(--muted);cursor:pointer;display:flex;align-items:center;padding:4px;border-radius:6px;transition:color var(--t);}
        .modal-close:hover{color:var(--text);}
        .modal-icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;}
        .modal-icon--green{background:var(--green-dim);color:var(--green);}
        .modal-icon--red{background:var(--red-dim);color:var(--red);}
        .modal-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:var(--text);margin-bottom:10px;}
        .modal-body{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:24px;}
        .modal-body strong{color:var(--text);font-weight:600;}
        .modal-actions{display:flex;gap:10px;justify-content:center;}
        .modal-btn{flex:1;padding:10px 20px;border-radius:10px;font-family:var(--font);font-size:14px;font-weight:600;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:all var(--t);}
        .modal-btn:disabled{opacity:0.55;cursor:not-allowed;}
        .modal-btn:not(:disabled):hover{transform:translateY(-1px);}
        .modal-btn--ghost{background:rgba(255,255,255,0.06);color:var(--muted);}
        .modal-btn--ghost:not(:disabled):hover{background:rgba(255,255,255,0.1);color:var(--text);}
        .modal-btn--green{background:var(--green);color:#042f1e;}
        .modal-btn--green:not(:disabled):hover{background:#2dd4a0;}
        .modal-btn--red{background:var(--red);color:#2d0707;}
        .modal-btn--red:not(:disabled):hover{background:#fb8080;}
        .btn-spin{width:12px;height:12px;border:2px solid rgba(0,0,0,0.25);border-top-color:currentColor;border-radius:50%;animation:spin 0.6s linear infinite;flex-shrink:0;}

        /* detail grid */
        .detail-grid{display:flex;flex-direction:column;gap:10px;}
        .detail-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid var(--border);}
        .detail-row-label{font-size:12.5px;color:var(--muted);font-weight:500;}
        .detail-row-value{font-size:13px;color:var(--text);font-weight:500;}

        /* extend picker */
        .extend-picker{display:flex;gap:8px;justify-content:center;margin-top:4px;flex-wrap:wrap;}
        .extend-option{padding:8px 18px;border-radius:9px;border:1px solid var(--border);background:var(--surface);color:var(--muted);font-family:var(--font);font-size:14px;font-weight:600;cursor:pointer;transition:all var(--t);}
        .extend-option:hover{border-color:var(--border-hover);color:var(--text);}
        .extend-option--on{background:var(--green-dim);border-color:rgba(52,211,153,0.4);color:var(--green);}

        /* toast */
        .toast{position:fixed;bottom:24px;right:24px;z-index:999;display:flex;align-items:center;gap:9px;padding:12px 18px;border-radius:12px;font-family:var(--font);font-size:13.5px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:toast-in 0.25s cubic-bezier(0.4,0,0.2,1) both;max-width:340px;}
        @keyframes toast-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .toast--ok{background:#0d2e1f;border:1px solid rgba(52,211,153,0.3);color:var(--green);}
        .toast--err{background:#2d0f0f;border:1px solid rgba(248,113,113,0.3);color:var(--red);}

        /* responsive */
        @media(max-width:768px){
          .stats-grid{grid-template-columns:repeat(2,1fr);}
          .stat-card--wide{grid-column:span 2;}
        }
        @media(max-width:640px){
          .page-header{align-items:flex-start;flex-direction:column;}
          .toolbar{flex-direction:column;align-items:stretch;}
          .search-wrap{max-width:100%;}
          .filter-tabs{overflow-x:auto;}
          .action-group{flex-direction:column;align-items:flex-start;}
          .btn-action{width:100%;justify-content:center;}
          .stats-grid{grid-template-columns:1fr 1fr;}
        }
      `}</style>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function StatCard({
  label, value, color, icon, wide = false,
}: { label: string; value: string | number; color: string; icon: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`stat-card${wide ? " stat-card--wide" : ""}`}>
      <div className="stat-card-top">
        <div className="stat-icon" style={{ background: `${color}18`, color }}>
          {icon}
        </div>
      </div>
      <div>
        <div className="stat-val" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

function SortArrow({ dir }: { dir: "asc" | "desc" }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: dir === "desc" ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="detail-row">
      <span className="detail-row-label">{label}</span>
      <span className="detail-row-value">{value}</span>
    </div>
  )
}