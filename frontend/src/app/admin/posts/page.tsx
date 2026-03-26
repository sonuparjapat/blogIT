"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import api from "@/lib/axios"
import DataTable from "@/components/admin/DataTable"
import StatusBadge from "@/components/admin/StatusBadge"
import Link from "next/link"

/* ─── types ─────────────────────────────────────────────────────────────── */
type Post = {
  id: number
  title: string
  username: string
  status: "draft" | "published" | "pending"   
  slug: string
  created_at: string
  reading_time: number
  views: number
}

type Category = {
  id: number
  name: string
  postCount?: string | number
}

type Tag = {
  id: number
  name: string
  slug: string
  postCount?: string | number
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
  | { type: "delete";  post: Post }
  | { type: "publish"; post: Post }

type StatusFilter = "published" | "draft" | "pending" | "all"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const LIMIT = 10

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function PostsPage() {
  const [posts,      setPosts]      = useState<Post[]>([])
  const [meta,       setMeta]       = useState<Meta | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState<ModalState>({ type: "none" })
  const [busy,       setBusy]       = useState(false)
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null)

  /* taxonomy */
  const [categories, setCategories] = useState<Category[]>([])
  const [tags,       setTags]       = useState<Tag[]>([])

  /* filters */
  const [search,         setSearch]         = useState("")
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("published")
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all")
  const [tagFilter,      setTagFilter]      = useState<number | "all">("all")
  const [page,           setPage]           = useState(1)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── fetch taxonomy ── */
  useEffect(() => {
    api.get("/categories")
      .then(res => setCategories(Array.isArray(res.data) ? res.data : (res.data?.data ?? [])))
      .catch(() => {})
    api.get("/tags")
      .then(res => setTags(Array.isArray(res.data) ? res.data : (res.data?.data ?? [])))
      .catch(() => {})
  }, [])

  /* ── fetch posts ── */
  const fetchPosts = useCallback(async (
    pg  = 1,
    q   = "",
    st  : StatusFilter   = "published",
    cat : number | "all" = "all",
    tag : number | "all" = "all",
  ) => {
    setLoading(true)
    try {
      if (q.trim()) {
        const res = await api.get("/posts/search", { params: { q: q.trim(), page: pg, limit: LIMIT } })
        const raw = res.data
        setPosts(Array.isArray(raw) ? raw : (raw?.data ?? []))
        setMeta(raw?.meta ?? null)
      } else {
        const params: Record<string, any> = { page: pg, limit: LIMIT }
        if (st  !== "all") params.status      = st
        if (cat !== "all") params.category_id = cat
        if (tag !== "all") params.tag_id      = tag
        const res = await api.get("/posts", { params })
        const raw = res.data
        setPosts(Array.isArray(raw) ? raw : (raw?.data ?? []))
        setMeta(raw?.meta ?? null)
      }
    } catch {
      showToast("Failed to load posts.", false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts(page, search, statusFilter, categoryFilter, tagFilter)
  }, [page, statusFilter, categoryFilter, tagFilter]) // eslint-disable-line

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetchPosts(1, search, statusFilter, categoryFilter, tagFilter)
    }, 400)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [search]) // eslint-disable-line

  /* ── toast ── */
  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── filter handlers ── */
  function handleStatusChange(val: StatusFilter)      { setStatusFilter(val);   setPage(1) }
  function handleCategoryChange(val: number | "all") { setCategoryFilter(val); setPage(1) }
  function handleTagChange(val: number | "all")      { setTagFilter(val);      setPage(1) }
  function clearAllFilters() {
    setStatusFilter("published"); setCategoryFilter("all"); setTagFilter("all"); setPage(1)
  }

  /* ── publish ── */
  async function confirmPublish() {
    if (modal.type !== "publish") return
    const post = modal.post
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append("status", "published")
      await api.patch(`/posts/${post.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } })
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: "published" } : p))
      setModal({ type: "none" })
      showToast(`"${post.title}" is now live.`, true)
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Publish failed.", false)
    } finally { setBusy(false) }
  }

/* ── unpublish ── */
async function unpublish(post: Post) {
  setBusy(true);

  try {
    // ✅ NEW ROUTE
    await api.patch(`/posts/${post.id}/unpublish`);

    // ✅ Update UI instantly
    setPosts(prev =>
      prev.map(p =>
        p.id === post.id ? { ...p, status: "draft" } : p
      )
    );

    showToast(`"${post.title}" moved to drafts.`, true);

  } catch (err: any) {
    showToast(
      err?.response?.data?.message || "Action failed.",
      false
    );
  } finally {
    setBusy(false);
  }
}
  /* ── delete ── */
  async function confirmDelete() {
    if (modal.type !== "delete") return
    const post = modal.post
    setBusy(true)
    try {
      await api.delete(`/posts/${post.id}`)
      setPosts(prev => prev.filter(p => p.id !== post.id))
      setModal({ type: "none" })
      showToast(`"${post.title}" deleted.`, true)
      if (posts.length === 1 && page > 1) setPage(p => p - 1)
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Delete failed.", false)
    } finally { setBusy(false) }
  }

  /* ── columns ── */
  const columns = [
    {
      label: "Title", key: "title",
      render: (row: Post) => (
        <div className="col-title">
          <span className="col-title-text">{row.title}</span>
          <span className="col-slug">/{row.slug}</span>
        </div>
      ),
    },
    {
      label: "Author", key: "username",
      render: (row: Post) => (
        <div className="col-author">
          <div className="col-avatar">{row.username?.[0]?.toUpperCase() ?? "?"}</div>
          {row.username}
        </div>
      ),
    },
    {
      label: "Stats", key: "stats",
      render: (row: Post) => (
        <div className="col-stats">
          <span className="col-stat">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {row.views ?? 0}
          </span>
          <span className="col-stat">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {row.reading_time ?? 1}m
          </span>
        </div>
      ),
    },
    {
      label: "Date", key: "created_at",
      render: (row: Post) => <span className="col-date">{formatDate(row.created_at)}</span>,
    },
    {
      label: "Status", key: "status",
      render: (row: Post) => <StatusBadge status={row.status} />,
    },
    {
      label: "Actions", key: "actions",
      render: (row: Post) => (
        <div className="action-group">
          <Link href={`/admin/posts/edit/${row.id}`} className="btn-action btn-edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Edit
          </Link>
        {row.status === "published" ? (
  <button className="btn-action btn-unpublish" disabled={busy} onClick={() => unpublish(row)}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
    Unpublish
  </button>
) : row.status === "pending" ? (
  <button className="btn-action btn-publish" disabled={busy} onClick={() => setModal({ type: "publish", post: row })}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12"/></svg>
    Approve
  </button>
) : (
  <button className="btn-action btn-publish" disabled={busy} onClick={() => setModal({ type: "publish", post: row })}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12"/></svg>
    Publish
  </button>
)}
          <button className="btn-action btn-delete" disabled={busy} onClick={() => setModal({ type: "delete", post: row })}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Delete
          </button>
        </div>
      ),
    },
  ]

  const totalPages    = meta?.totalPages ?? 1
  const activeFilters = (statusFilter !== "published" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0) + (tagFilter !== "all" ? 1 : 0)
  const activeCatName = categories.find(c => c.id === categoryFilter)?.name ?? "Category"
  const activeTagName = tags.find(t => t.id === tagFilter)?.name ?? "Tag"
  const hasActivePills = !search && (categoryFilter !== "all" || tagFilter !== "all")

  /* ── render ── */
  return (
    <div className="posts-page">

      {/* ── Header ── */}
      <div className="page-header">
        <div className="header-left">
          <div className="page-eyebrow"><span className="eyebrow-dot"/>Content Management</div>
          <h1 className="page-title">Posts</h1>
          <p className="page-sub">{meta ? `${meta.total} total entr${meta.total === 1 ? "y" : "ies"}` : "—"}</p>
        </div>
        <div className="header-actions">
          <button
            className="refresh-btn"
            onClick={() => fetchPosts(page, search, statusFilter, categoryFilter, tagFilter)}
            disabled={loading}
            title="Refresh"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}>
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
            </svg>
          </button>
          <Link href="/admin/posts/create" className="create-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Post
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-bar">
        {[
          { label: "Total",   value: meta?.total ?? "—", color: "var(--accent)" },
          { label: "Page",    value: totalPages > 1 ? `${page} / ${totalPages}` : "1 / 1", color: "var(--muted)" },
          { label: "Showing", value: posts.length, color: "var(--green)" },
        ].map(s => (
          <div key={s.label} className="stat-chip">
            <span className="stat-val" style={{ color: s.color }}>{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
        {activeFilters > 0 && (
          <button className="clear-filters-btn" onClick={clearAllFilters}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Clear filters ({activeFilters})
          </button>
        )}
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
            placeholder="Search posts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => { setSearch(""); setPage(1) }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Filters — hidden while searching */}
        {!search && (
          <>
            {/* Status tabs */}
            <div className="filter-tabs">
              {(["published", "draft", "pending", "all"] as StatusFilter[])?.map(s => (
                <button
                  key={s}
                  className={`filter-tab ${statusFilter === s ? "filter-tab--on" : ""}`}
                  onClick={() => handleStatusChange(s)}
                >
                {s === "all"
  ? "All"
  : s === "pending"
  ? "Pending"
  : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Category dropdown */}
            {categories.length > 0 && (
              <div className="dropdown-wrap">
                <svg className="dropdown-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                <select
                  className={`dropdown-select ${categoryFilter !== "all" ? "dropdown-select--active" : ""}`}
                  value={categoryFilter}
                  onChange={e => handleCategoryChange(e.target.value === "all" ? "all" : Number(e.target.value))}
                >
                  <option value="all">All categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.postCount !== undefined ? ` (${Number(c.postCount)})` : ""}
                    </option>
                  ))}
                </select>
                {categoryFilter !== "all" && (
                  <button className="dropdown-clear" onClick={() => handleCategoryChange("all")}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            )}

            {/* Tag dropdown */}
            {tags.length > 0 && (
              <div className="dropdown-wrap">
                <svg className="dropdown-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                <select
                  className={`dropdown-select ${tagFilter !== "all" ? "dropdown-select--active" : ""}`}
                  value={tagFilter}
                  onChange={e => handleTagChange(e.target.value === "all" ? "all" : Number(e.target.value))}
                >
                  <option value="all">All tags</option>
                  {tags.map(t => (
                    <option key={t.id} value={t.id}>#{t.name}</option>
                  ))}
                </select>
                {tagFilter !== "all" && (
                  <button className="dropdown-clear" onClick={() => handleTagChange("all")}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {search && <span className="search-hint">Searching across all statuses</span>}
      </div>

      {/* ── Active filter pills ── */}
      {hasActivePills && (
        <div className="active-filters">
          {categoryFilter !== "all" && (
            <span className="active-filter-pill active-filter-pill--cat">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              {activeCatName}
              <button onClick={() => handleCategoryChange("all")}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
          )}
          {tagFilter !== "all" && (
            <span className="active-filter-pill active-filter-pill--tag">
              <span className="pill-hash">#</span>
              {activeTagName}
              <button onClick={() => handleTagChange("all")}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"/>
            <span>Loading posts…</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", marginBottom: 12 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
            </svg>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              {search
                ? `No posts found for "${search}"`
                : categoryFilter !== "all"
                ? `No posts in "${activeCatName}"`
                : tagFilter !== "all"
                ? `No posts tagged "#${activeTagName}"`
                : "No posts yet."}
            </p>
            {!search && (categoryFilter !== "all" || tagFilter !== "all") ? (
              <button className="create-btn" onClick={clearAllFilters} style={{ marginTop: 16 }}>
                Clear filters
              </button>
            ) : !search ? (
              <Link href="/admin/posts/create" className="create-btn" style={{ marginTop: 16 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create Post
              </Link>
            ) : null}
          </div>
        ) : (
          <DataTable columns={columns} data={posts} />
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button className="pg-btn" disabled={page <= 1} onClick={() => setPage(1)} title="First">
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
          <button className="pg-btn" disabled={page >= totalPages} onClick={() => setPage(totalPages)} title="Last">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
          </button>
          <span className="pg-info">{meta?.total ?? 0} total</span>
        </div>
      )}

      {/* ── Publish Modal ── */}
      {modal.type === "publish" && (
        <div className="modal-backdrop" onClick={() => !busy && setModal({ type: "none" })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon modal-icon--green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 className="modal-title">Publish post?</h3>
            <p className="modal-body"><strong>"{modal.post.title}"</strong> will be visible to all readers.</p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn--ghost" onClick={() => setModal({ type: "none" })} disabled={busy}>Cancel</button>
              <button className="modal-btn modal-btn--green" onClick={confirmPublish} disabled={busy}>
                {busy ? <><span className="btn-spin"/>Publishing…</> : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {modal.type === "delete" && (
        <div className="modal-backdrop" onClick={() => !busy && setModal({ type: "none" })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon modal-icon--red">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
              </svg>
            </div>
            <h3 className="modal-title">Delete post?</h3>
            <p className="modal-body"><strong>"{modal.post.title}"</strong> will be soft-deleted and can be recovered by an admin.</p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn--ghost" onClick={() => setModal({ type: "none" })} disabled={busy}>Cancel</button>
              <button className="modal-btn modal-btn--red" onClick={confirmDelete} disabled={busy}>
                {busy ? <><span className="btn-spin"/>Deleting…</> : "Delete"}
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

        /* page */
        .posts-page{display:flex;flex-direction:column;gap:20px;font-family:var(--font);animation:page-in 0.4s cubic-bezier(0.4,0,0.2,1) both;}
        @keyframes page-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
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
        .create-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:var(--accent);color:#fff;border-radius:var(--radius);font-family:var(--font);font-size:14px;font-weight:500;text-decoration:none;white-space:nowrap;box-shadow:0 4px 20px rgba(99,102,241,0.35);transition:background var(--t),transform var(--t);border:none;cursor:pointer;}
        .create-btn:hover{background:#4f52e8;transform:translateY(-1px);}

        /* stats */
        .stats-bar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;}
        .stat-chip{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 16px;}
        .stat-val{font-size:20px;font-weight:700;font-family:'Syne',sans-serif;}
        .stat-label{font-size:12px;color:var(--muted);}
        .clear-filters-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.22);border-radius:10px;color:var(--accent);font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer;transition:background var(--t);}
        .clear-filters-btn:hover{background:rgba(99,102,241,0.18);}

        /* toolbar */
        .toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
        .search-wrap{position:relative;flex:1;min-width:200px;max-width:320px;}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;}
        .search-inp{width:100%;height:38px;padding:0 36px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font);font-size:13.5px;outline:none;transition:border-color var(--t),box-shadow var(--t);}
        .search-inp:focus{border-color:rgba(99,102,241,0.5);box-shadow:0 0 0 3px rgba(99,102,241,0.1);}
        .search-inp::placeholder{color:var(--muted);}
        .search-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;width:20px;height:20px;}
        .search-clear:hover{color:var(--text);}
        .search-hint{font-size:12px;color:var(--muted);font-style:italic;}

        /* status tabs */
        .filter-tabs{display:flex;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:3px;gap:2px;}
        .filter-tab{padding:5px 14px;border-radius:8px;border:none;font-family:var(--font);font-size:12.5px;font-weight:500;color:var(--muted);background:transparent;cursor:pointer;transition:background var(--t),color var(--t);white-space:nowrap;}
        .filter-tab:hover{color:var(--text);}
        .filter-tab--on{background:var(--elevated);color:var(--text);box-shadow:inset 0 0 0 1px var(--border);}

        /* dropdowns (category + tag) */
        .dropdown-wrap{position:relative;display:flex;align-items:center;}
        .dropdown-icon{position:absolute;left:10px;color:var(--muted);pointer-events:none;z-index:1;}
        .dropdown-select{height:38px;padding:0 30px 0 30px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);color:var(--muted);font-family:var(--font);font-size:13px;outline:none;cursor:pointer;transition:border-color var(--t),color var(--t),background var(--t);appearance:none;-webkit-appearance:none;}
        .dropdown-select option{background:var(--surface);color:var(--text);}
        .dropdown-select:hover{border-color:var(--border-hover);}
        .dropdown-select:focus{border-color:rgba(99,102,241,0.5);box-shadow:0 0 0 3px rgba(99,102,241,0.1);}
        .dropdown-select--active{border-color:rgba(99,102,241,0.4);color:var(--accent);background:rgba(99,102,241,0.08);}
        .dropdown-clear{position:absolute;right:8px;background:none;border:none;color:var(--muted);cursor:pointer;display:flex;align-items:center;padding:2px;border-radius:3px;transition:color var(--t);}
        .dropdown-clear:hover{color:var(--text);}

        /* active filter pills */
        .active-filters{display:flex;gap:8px;flex-wrap:wrap;}
        .active-filter-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 8px 4px 10px;border-radius:20px;font-size:12px;font-weight:500;}
        .active-filter-pill button{background:none;border:none;color:inherit;cursor:pointer;display:flex;align-items:center;opacity:0.65;padding:0;transition:opacity var(--t);}
        .active-filter-pill button:hover{opacity:1;}
        .active-filter-pill--cat{background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);color:var(--accent);}
        .active-filter-pill--tag{background:rgba(45,212,191,0.1);border:1px solid rgba(45,212,191,0.22);color:var(--teal);}
        .pill-hash{font-weight:700;font-size:13px;opacity:0.5;}

        /* table */
        .table-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;}
        .loading-state,.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 24px;gap:10px;color:var(--muted);font-size:14px;}
        .loading-spinner{width:28px;height:28px;border:2.5px solid rgba(255,255,255,0.1);border-top-color:var(--accent);border-radius:50%;animation:spin 0.7s linear infinite;margin-bottom:4px;}

        /* columns */
        .col-title{display:flex;flex-direction:column;gap:3px;}
        .col-title-text{font-weight:500;color:var(--text);font-size:13.5px;}
        .col-slug{font-size:11px;color:var(--muted);font-family:monospace;}
        .col-author{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);}
        .col-avatar{width:26px;height:26px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .col-stats{display:flex;gap:10px;}
        .col-stat{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted);}
        .col-date{font-size:12.5px;color:var(--muted);white-space:nowrap;}

        /* action buttons */
        .action-group{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
        .btn-action{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:7px;font-family:var(--font);font-size:12px;font-weight:500;border:none;cursor:pointer;text-decoration:none;transition:background var(--t),transform var(--t),opacity var(--t);white-space:nowrap;}
        .btn-action:disabled{opacity:0.45;cursor:not-allowed;}
        .btn-action:not(:disabled):hover{transform:translateY(-1px);}
        .btn-edit{background:rgba(255,255,255,0.06);color:var(--muted);}
        .btn-edit:not(:disabled):hover{background:rgba(255,255,255,0.1);color:var(--text);}
        .btn-publish{background:var(--green-dim);color:var(--green);}
        .btn-publish:not(:disabled):hover{background:rgba(52,211,153,0.2);}
        .btn-unpublish{background:var(--amber-dim);color:var(--amber);}
        .btn-unpublish:not(:disabled):hover{background:rgba(251,191,36,0.2);}
        .btn-delete{background:var(--red-dim);color:var(--red);}
        .btn-delete:not(:disabled):hover{background:rgba(248,113,113,0.2);}

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
        @keyframes slide-up{from{opacity:0;transform:translateY(16px) scale(0.97)}to{opacity:1;transform:none}}
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

        /* toast */
        .toast{position:fixed;bottom:24px;right:24px;z-index:999;display:flex;align-items:center;gap:9px;padding:12px 18px;border-radius:12px;font-family:var(--font);font-size:13.5px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:toast-in 0.25s cubic-bezier(0.4,0,0.2,1) both;max-width:340px;}
        @keyframes toast-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .toast--ok{background:#0d2e1f;border:1px solid rgba(52,211,153,0.3);color:var(--green);}
        .toast--err{background:#2d0f0f;border:1px solid rgba(248,113,113,0.3);color:var(--red);}

        /* responsive */
        @media(max-width:640px){
          .page-header{align-items:flex-start;flex-direction:column;}
          .create-btn{width:100%;justify-content:center;}
          .toolbar{flex-direction:column;align-items:stretch;}
          .search-wrap{max-width:100%;}
          .dropdown-wrap{width:100%;}
          .dropdown-select{width:100%;}
          .action-group{flex-direction:column;align-items:flex-start;}
          .btn-action{width:100%;justify-content:center;}
        }
      `}</style>
    </div>
  )
}