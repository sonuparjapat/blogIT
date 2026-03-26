"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import api from "@/lib/axios"
import DataTable from "@/components/admin/DataTable"

/* ─── types ─────────────────────────────────────────────────────────────── */
type Category = {
  id: number
  name: string
  slug: string
  description: string | null
  postCount: number
}

type ModalMode = "none" | "create" | "edit" | "delete"

type ModalState =
  | { mode: "none" }
  | { mode: "create" }
  | { mode: "edit";   cat: Category }
  | { mode: "delete"; cat: Category }

const LIMIT = 10

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function CategoriesPage() {
  const [all,      setAll]      = useState<Category[]>([])   // full list (client-side filter)
  const [filtered, setFiltered] = useState<Category[]>([])
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<ModalState>({ mode: "none" })
  const [busy,     setBusy]     = useState(false)
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)
  const [search,   setSearch]   = useState("")

  /* form state */
  const [fname, setFname] = useState("")
  const [fdesc, setFdesc] = useState("")
  const [ferr,  setFerr]  = useState("")

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── fetch ── */
  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get("/categories")
      const data: Category[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
      setAll(data)
      applyFilter(data, search)
    } catch {
      showToast("Failed to load categories.", false)
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  useEffect(() => { fetchCategories() }, [fetchCategories])

  /* ── client-side search + pagination ── */
  function applyFilter(data: Category[], q: string) {
    const q2 = q.trim().toLowerCase()
    const result = q2
      ? data.filter(c =>
          c.name.toLowerCase().includes(q2) ||
          c.slug.toLowerCase().includes(q2) ||
          (c.description ?? "").toLowerCase().includes(q2)
        )
      : data
    setFiltered(result)
    setPage(1)
  }

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => applyFilter(all, search), 250)
    return () => { if (searchRef.current) clearTimeout(searchRef.current) }
  }, [search, all]) // eslint-disable-line

  /* pagination slice */
  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT))
  const paginated  = filtered.slice((page - 1) * LIMIT, page * LIMIT)

  /* ── toast ── */
  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── open modal ── */
  function openCreate() {
    setFname(""); setFdesc(""); setFerr("")
    setModal({ mode: "create" })
  }
  function openEdit(cat: Category) {
    setFname(cat.name); setFdesc(cat.description ?? ""); setFerr("")
    setModal({ mode: "edit", cat })
  }
  function closeModal() {
    if (!busy) setModal({ mode: "none" })
  }

  /* ── create ── */
  async function handleCreate() {
    if (!fname.trim()) { setFerr("Name is required."); return }
    setBusy(true); setFerr("")
    try {
      await api.post("/categories", { name: fname.trim(), description: fdesc.trim() || null })
      setModal({ mode: "none" })
      showToast(`"${fname.trim()}" created.`, true)
      fetchCategories()
    } catch (err: any) {
      setFerr(err?.response?.data?.message || "Failed to create category.")
    } finally {
      setBusy(false)
    }
  }

  /* ── update ── */
  async function handleUpdate() {
    if (modal.mode !== "edit") return
    if (!fname.trim()) { setFerr("Name is required."); return }
    setBusy(true); setFerr("")
    try {
      await api.put(`/categories/${modal.cat.id}`, { name: fname.trim(), description: fdesc.trim() || null })
      setModal({ mode: "none" })
      showToast(`"${fname.trim()}" updated.`, true)
      fetchCategories()
    } catch (err: any) {
      setFerr(err?.response?.data?.message || "Failed to update category.")
    } finally {
      setBusy(false)
    }
  }

  /* ── delete ── */
  async function handleDelete() {
    if (modal.mode !== "delete") return
    const cat = modal.cat
    setBusy(true)
    try {
      await api.delete(`/categories/${cat.id}`)
      setModal({ mode: "none" })
      showToast(`"${cat.name}" deleted.`, true)
      fetchCategories()
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Delete failed.", false)
    } finally {
      setBusy(false)
    }
  }

  /* ── columns ── */
  const columns = [
    {
      label: "Category", key: "name",
      render: (row: Category) => (
        <div className="col-cat">
          <div className="col-cat-icon">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div className="col-cat-info">
            <span className="col-cat-name">{row.name}</span>
            <span className="col-cat-slug">/{row.slug}</span>
          </div>
        </div>
      ),
    },
    {
      label: "Description", key: "description",
      render: (row: Category) => (
        <span className="col-desc">
          {row.description || <em style={{ color: "var(--muted)", fontStyle: "normal" }}>—</em>}
        </span>
      ),
    },
    {
      label: "Posts", key: "postCount",
      render: (row: Category) => (
        <div className="col-count">
          <span className="col-count-num">{row.postCount}</span>
          <span className="col-count-label">post{row.postCount !== 1 ? "s" : ""}</span>
        </div>
      ),
    },
    {
      label: "Actions", key: "actions",
      render: (row: Category) => (
        <div className="action-group">
          <button className="btn-action btn-edit" onClick={() => openEdit(row)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Edit
          </button>
          <button
            className="btn-action btn-delete"
            onClick={() => setModal({ mode: "delete", cat: row })}
            disabled={Number(row.postCount) > 0}
            title={Number(row.postCount) > 0 ? "Remove posts first" : "Delete"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Delete
          </button>
        </div>
      ),
    },
  ]

  /* ── render ── */
  return (
    <div className="cat-page">

      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <div className="page-eyebrow"><span className="eyebrow-dot"/>Taxonomy</div>
          <h1 className="page-title">Categories</h1>
          <p className="page-sub">{all.length} total categor{all.length === 1 ? "y" : "ies"}</p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={fetchCategories} disabled={loading} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}>
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
            </svg>
          </button>
          <button className="create-btn" onClick={openCreate}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Category
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        {[
          { label: "Total",      value: all.length,                                              color: "var(--accent)" },
          { label: "With posts", value: all.filter(c => Number(c.postCount) > 0).length,         color: "var(--green)"  },
          { label: "Empty",      value: all.filter(c => Number(c.postCount) === 0).length,       color: "var(--muted)"  },
        ].map(s => (
          <div key={s.label} className="stat-chip">
            <span className="stat-val" style={{ color: s.color }}>{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="search-inp"
            placeholder="Search categories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        {search && filtered.length > 0 && (
          <span className="search-hint">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"/>
            <span>Loading categories…</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", marginBottom: 12 }}>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              {search ? `No categories match "${search}"` : "No categories yet."}
            </p>
            {!search && (
              <button className="create-btn" onClick={openCreate} style={{ marginTop: 16 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Category
              </button>
            )}
          </div>
        ) : (
          <DataTable columns={columns} data={paginated} />
        )}
      </div>

      {/* Pagination */}
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
          <span className="pg-info">{filtered.length} total</span>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {(modal.mode === "create" || modal.mode === "edit") && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {modal.mode === "create"
                    ? <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
                    : <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>
                  }
                </svg>
              </div>
              <div>
                <h3 className="modal-title">{modal.mode === "create" ? "New Category" : "Edit Category"}</h3>
                <p className="modal-subtitle">{modal.mode === "create" ? "Add a new content category" : `Editing "${(modal as any).cat.name}"`}</p>
              </div>
              <button className="modal-close" onClick={closeModal} disabled={busy}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-field">
                <label className="form-label">
                  Name <span className="form-required">*</span>
                </label>
                <input
                  className={`form-inp ${ferr && !fname.trim() ? "form-inp--err" : ""}`}
                  placeholder="e.g. Technology"
                  value={fname}
                  onChange={e => { setFname(e.target.value); setFerr("") }}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") modal.mode === "create" ? handleCreate() : handleUpdate() }}
                />
                {fname.trim() && (
                  <div className="form-slug-preview">
                    Slug: <code>{fname.trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-")}</code>
                  </div>
                )}
              </div>

              <div className="form-field">
                <label className="form-label">Description <span className="form-optional">optional</span></label>
                <textarea
                  className="form-ta"
                  placeholder="What kind of content belongs here?"
                  value={fdesc}
                  onChange={e => setFdesc(e.target.value)}
                  rows={3}
                />
                <div className="form-charcount">{fdesc.length} / 300</div>
              </div>

              {ferr && (
                <div className="form-err">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {ferr}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="modal-btn modal-btn--ghost" onClick={closeModal} disabled={busy}>Cancel</button>
              <button
                className="modal-btn modal-btn--accent"
                onClick={modal.mode === "create" ? handleCreate : handleUpdate}
                disabled={busy}
              >
                {busy
                  ? <><span className="btn-spin"/>Saving…</>
                  : modal.mode === "create" ? "Create Category" : "Save Changes"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {modal.mode === "delete" && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-icon-circle modal-icon-circle--red">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
              </svg>
            </div>
            <h3 className="modal-title" style={{ textAlign: "center", marginBottom: 8 }}>Delete category?</h3>
            <p className="modal-del-body">
              <strong>"{modal.cat.name}"</strong> will be permanently removed. This cannot be undone.
            </p>
            <div className="modal-footer">
              <button className="modal-btn modal-btn--ghost" onClick={closeModal} disabled={busy}>Cancel</button>
              <button className="modal-btn modal-btn--red" onClick={handleDelete} disabled={busy}>
                {busy ? <><span className="btn-spin"/>Deleting…</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.ok ? "toast--ok" : "toast--err"}`}>
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
          --bg:#0a0a0f; --surface:#111118; --elevated:#16161f;
          --border:rgba(255,255,255,0.07); --border-hover:rgba(255,255,255,0.13);
          --text:rgba(255,255,255,0.90); --muted:rgba(255,255,255,0.38);
          --accent:#6366f1; --accent-dim:rgba(99,102,241,0.15); --accent-glow:rgba(99,102,241,0.3);
          --green:#34d399; --green-dim:rgba(52,211,153,0.12);
          --red:#f87171; --red-dim:rgba(248,113,113,0.12);
          --font:'DM Sans',-apple-system,sans-serif; --radius:12px;
          --t:0.18s cubic-bezier(0.4,0,0.2,1);
        }
        .cat-page { display:flex; flex-direction:column; gap:20px; font-family:var(--font); animation:page-in 0.4s cubic-bezier(0.4,0,0.2,1) both; }
        @keyframes page-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }

        /* header */
        .page-header { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .header-left { display:flex; flex-direction:column; gap:6px; }
        .header-actions { display:flex; align-items:center; gap:10px; }
        .page-eyebrow { display:flex; align-items:center; gap:7px; font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:var(--accent); }
        .eyebrow-dot { width:6px; height:6px; border-radius:50%; background:var(--accent); box-shadow:0 0 8px var(--accent-glow); animation:pulse-dot 2.4s ease-in-out infinite; }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.75)} }
        .page-title { font-family:'Syne',sans-serif; font-weight:800; font-size:clamp(26px,4vw,34px); color:var(--text); letter-spacing:-0.02em; line-height:1.1; }
        .page-sub { font-size:13px; color:var(--muted); }
        .refresh-btn { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); color:var(--muted); cursor:pointer; transition:color var(--t),border-color var(--t); }
        .refresh-btn:hover:not(:disabled) { color:var(--text); border-color:var(--border-hover); }
        .refresh-btn:disabled { opacity:0.5; }
        .create-btn { display:inline-flex; align-items:center; gap:8px; padding:10px 20px; background:var(--accent); color:#fff; border-radius:var(--radius); font-family:var(--font); font-size:14px; font-weight:500; border:none; cursor:pointer; white-space:nowrap; box-shadow:0 4px 20px rgba(99,102,241,0.35); transition:background var(--t),transform var(--t); }
        .create-btn:hover { background:#4f52e8; transform:translateY(-1px); }

        /* stats */
        .stats-bar { display:flex; gap:12px; flex-wrap:wrap; }
        .stat-chip { display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:8px 16px; }
        .stat-val { font-size:20px; font-weight:700; font-family:'Syne',sans-serif; }
        .stat-label { font-size:12px; color:var(--muted); }

        /* toolbar */
        .toolbar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .search-wrap { position:relative; flex:1; min-width:200px; max-width:380px; }
        .search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--muted); pointer-events:none; }
        .search-inp { width:100%; height:38px; padding:0 36px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); color:var(--text); font-family:var(--font); font-size:13.5px; outline:none; transition:border-color var(--t),box-shadow var(--t); }
        .search-inp:focus { border-color:rgba(99,102,241,0.5); box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
        .search-inp::placeholder { color:var(--muted); }
        .search-clear { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--muted); cursor:pointer; display:flex; align-items:center; justify-content:center; width:20px; height:20px; }
        .search-clear:hover { color:var(--text); }
        .search-hint { font-size:12px; color:var(--muted); }

        /* table card */
        .table-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
        .loading-state, .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:64px 24px; gap:10px; color:var(--muted); font-size:14px; }
        .loading-spinner { width:28px; height:28px; border:2.5px solid rgba(255,255,255,0.1); border-top-color:var(--accent); border-radius:50%; animation:spin 0.7s linear infinite; margin-bottom:4px; }

        /* column cells */
        .col-cat { display:flex; align-items:center; gap:12px; }
        .col-cat-icon { width:34px; height:34px; border-radius:10px; background:var(--accent-dim); color:var(--accent); font-size:14px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-family:'Syne',sans-serif; }
        .col-cat-info { display:flex; flex-direction:column; gap:2px; }
        .col-cat-name { font-weight:500; color:var(--text); font-size:13.5px; }
        .col-cat-slug { font-size:11px; color:var(--muted); font-family:monospace; }
        .col-desc { font-size:13px; color:var(--muted); max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; }
        .col-count { display:flex; align-items:baseline; gap:4px; }
        .col-count-num { font-size:18px; font-weight:700; font-family:'Syne',sans-serif; color:var(--text); }
        .col-count-label { font-size:11px; color:var(--muted); }

        /* action buttons */
        .action-group { display:flex; align-items:center; gap:6px; }
        .btn-action { display:inline-flex; align-items:center; gap:5px; padding:5px 11px; border-radius:7px; font-family:var(--font); font-size:12px; font-weight:500; border:none; cursor:pointer; transition:background var(--t),transform var(--t),opacity var(--t); white-space:nowrap; }
        .btn-action:disabled { opacity:0.3; cursor:not-allowed; }
        .btn-action:not(:disabled):hover { transform:translateY(-1px); }
        .btn-edit { background:rgba(255,255,255,0.06); color:var(--muted); }
        .btn-edit:hover { background:rgba(255,255,255,0.1); color:var(--text); }
        .btn-delete { background:var(--red-dim); color:var(--red); }
        .btn-delete:not(:disabled):hover { background:rgba(248,113,113,0.2); }

        /* pagination */
        .pagination { display:flex; align-items:center; gap:6px; justify-content:center; flex-wrap:wrap; }
        .pg-btn { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--muted); cursor:pointer; transition:all var(--t); }
        .pg-btn:hover:not(:disabled) { color:var(--text); border-color:var(--border-hover); background:var(--elevated); }
        .pg-btn:disabled { opacity:0.3; cursor:not-allowed; }
        .pg-numbers { display:flex; align-items:center; gap:4px; }
        .pg-num { width:34px; height:34px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--muted); font-family:var(--font); font-size:13px; cursor:pointer; transition:all var(--t); }
        .pg-num:hover { color:var(--text); border-color:var(--border-hover); background:var(--elevated); }
        .pg-num--on { background:var(--accent); border-color:var(--accent); color:#fff; font-weight:600; }
        .pg-ellipsis { width:34px; text-align:center; color:var(--muted); font-size:13px; }
        .pg-info { font-size:12px; color:var(--muted); margin-left:8px; }

        /* modal backdrop */
        .modal-backdrop { position:fixed; inset:0; z-index:900; background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px; animation:fade-in 0.15s ease both; }
        @keyframes fade-in { from{opacity:0} to{opacity:1} }
        .modal { background:var(--elevated); border:1px solid var(--border-hover); border-radius:18px; max-width:460px; width:100%; animation:slide-up 0.2s cubic-bezier(0.4,0,0.2,1) both; box-shadow:0 24px 80px rgba(0,0,0,0.6); overflow:hidden; }
        .modal--sm { max-width:380px; padding:28px 24px 20px; text-align:center; }
        @keyframes slide-up { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:none} }

        .modal-header { display:flex; align-items:center; gap:14px; padding:22px 22px 0; }
        .modal-header-icon { width:38px; height:38px; border-radius:10px; background:var(--accent-dim); color:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .modal-title { font-family:'Syne',sans-serif; font-size:17px; font-weight:700; color:var(--text); letter-spacing:-0.01em; }
        .modal-subtitle { font-size:12px; color:var(--muted); margin-top:2px; }
        .modal-close { margin-left:auto; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:8px; width:30px; height:30px; display:flex; align-items:center; justify-content:center; color:var(--muted); cursor:pointer; transition:all var(--t); flex-shrink:0; }
        .modal-close:hover { color:var(--text); border-color:var(--border-hover); }

        .modal-body { padding:20px 22px; display:flex; flex-direction:column; gap:16px; }

        .modal-icon-circle { width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
        .modal-icon-circle--red { background:var(--red-dim); color:var(--red); }
        .modal-del-body { font-size:13.5px; color:var(--muted); line-height:1.6; margin-bottom:20px; }
        .modal-del-body strong { color:var(--text); }

        .modal-footer { display:flex; gap:10px; padding:16px 22px 20px; }
        .modal--sm .modal-footer { padding:0; }
        .modal-btn { flex:1; padding:10px 18px; border-radius:10px; font-family:var(--font); font-size:13.5px; font-weight:600; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:7px; transition:all var(--t); }
        .modal-btn:disabled { opacity:0.55; cursor:not-allowed; }
        .modal-btn:not(:disabled):hover { transform:translateY(-1px); }
        .modal-btn--ghost { background:rgba(255,255,255,0.06); color:var(--muted); }
        .modal-btn--ghost:not(:disabled):hover { background:rgba(255,255,255,0.1); color:var(--text); }
        .modal-btn--accent { background:var(--accent); color:#fff; box-shadow:0 4px 16px rgba(99,102,241,0.3); }
        .modal-btn--accent:not(:disabled):hover { background:#4f52e8; }
        .modal-btn--red { background:var(--red); color:#2d0707; }
        .modal-btn--red:not(:disabled):hover { background:#fb8080; }

        /* form */
        .form-field { display:flex; flex-direction:column; gap:7px; }
        .form-label { font-size:11px; font-weight:600; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); display:flex; align-items:center; gap:5px; }
        .form-required { color:var(--red); font-size:12px; }
        .form-optional { font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted); font-size:10px; }
        .form-inp { width:100%; height:40px; padding:0 14px; background:var(--surface); border:1px solid var(--border); border-radius:9px; color:var(--text); font-family:var(--font); font-size:14px; outline:none; transition:border-color var(--t),box-shadow var(--t); }
        .form-inp:focus { border-color:rgba(99,102,241,0.5); box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
        .form-inp::placeholder { color:var(--muted); }
        .form-inp--err { border-color:rgba(248,113,113,0.5); }
        .form-ta { width:100%; padding:10px 14px; background:var(--surface); border:1px solid var(--border); border-radius:9px; color:var(--text); font-family:var(--font); font-size:14px; outline:none; resize:vertical; min-height:80px; line-height:1.6; transition:border-color var(--t),box-shadow var(--t); }
        .form-ta:focus { border-color:rgba(99,102,241,0.5); box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
        .form-ta::placeholder { color:var(--muted); }
        .form-charcount { font-size:11px; color:var(--muted); text-align:right; margin-top:-4px; }
        .form-slug-preview { font-size:11.5px; color:var(--muted); }
        .form-slug-preview code { color:var(--accent); font-size:11px; background:var(--accent-dim); padding:1px 6px; border-radius:4px; }
        .form-err { display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--red-dim); border:1px solid rgba(248,113,113,0.2); border-radius:9px; color:var(--red); font-size:13px; }

        /* btn spinner */
        .btn-spin { width:12px; height:12px; border:2px solid rgba(255,255,255,0.25); border-top-color:currentColor; border-radius:50%; animation:spin 0.6s linear infinite; flex-shrink:0; }

        /* toast */
        .toast { position:fixed; bottom:24px; right:24px; z-index:999; display:flex; align-items:center; gap:9px; padding:12px 18px; border-radius:12px; font-family:var(--font); font-size:13.5px; font-weight:500; box-shadow:0 8px 32px rgba(0,0,0,0.4); animation:toast-in 0.25s cubic-bezier(0.4,0,0.2,1) both; max-width:340px; }
        @keyframes toast-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        .toast--ok  { background:#0d2e1f; border:1px solid rgba(52,211,153,0.3); color:var(--green); }
        .toast--err { background:#2d0f0f; border:1px solid rgba(248,113,113,0.3); color:var(--red); }

        @media(max-width:640px) {
          .page-header { align-items:flex-start; flex-direction:column; }
          .create-btn { width:100%; justify-content:center; }
          .toolbar { flex-direction:column; align-items:stretch; }
          .search-wrap { max-width:100%; }
          .action-group { flex-direction:column; }
          .btn-action { width:100%; justify-content:center; }
        }
      `}</style>
    </div>
  )
}