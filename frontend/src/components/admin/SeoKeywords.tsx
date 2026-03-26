"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import api from "@/lib/axios"

type Keyword = { id: number; keyword: string }

type Props = {
  postId: string | number   // accepts both — edit page passes string
}

export default function SeoKeywords({ postId }: Props) {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [input,    setInput]    = useState("")
  const [loading,  setLoading]  = useState(true)
  const [adding,   setAdding]   = useState(false)
  const [error,    setError]    = useState("")
  const [deleting, setDeleting] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* ── fetch ── */
  const fetchKeywords = useCallback(async () => {
    if (!postId) return
    setLoading(true)
    try {
      const res = await api.get(`/seoroutes/seo/${postId}`)
      setKeywords(Array.isArray(res.data) ? res.data : [])
    } catch {
      setError("Failed to load keywords.")
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => { fetchKeywords() }, [fetchKeywords])

  /* ── add ── */
  async function handleAdd() {
    const raw = input.trim()
    if (!raw) return
    setError("")

    // split by comma, clean, dedupe against existing
    const incoming = raw
      .split(",")
      .map(k => k.trim().toLowerCase())
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)              // dedupe within input
      .filter(k => !keywords.some(e => e.keyword === k))    // skip already saved

    if (!incoming.length) {
      setError("All keywords already added.")
      return
    }

    setAdding(true)
    try {
      const res = await api.post("/seoroutes/seo", {
        post_id:  Number(postId),
        keywords: incoming,
      })
      // backend now returns the full updated list
      setKeywords(res.data?.keywords ?? [...keywords])
      setInput("")
      inputRef.current?.focus()
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to add keywords.")
    } finally {
      setAdding(false)
    }
  }

  /* ── delete ── */
  async function handleDelete(id: number) {
    setDeleting(id)
    try {
      await api.delete(`/seoroutes/seo/${id}`)
      setKeywords(prev => prev.filter(k => k.id !== id))
    } catch {
      setError("Failed to delete keyword.")
    } finally {
      setDeleting(null)
    }
  }

  /* ── keyboard ── */
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd() }
  }

  /* ── render ── */
  return (
    <div className="seo-kw">

      <div className="seo-kw-hd">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        SEO Keywords
        {keywords.length > 0 && (
          <span className="seo-kw-count">{keywords.length}</span>
        )}
        <span className="seo-kw-hint">Separate with commas · Enter to add</span>
      </div>

      {/* input row */}
      <div className={`seo-kw-input-row ${error ? "seo-kw-input-row--err" : ""}`}>
        <svg className="seo-kw-input-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <input
          ref={inputRef}
          className="seo-kw-input"
          placeholder="e.g. nextjs tutorial, react hooks, web dev…"
          value={input}
          onChange={e => { setInput(e.target.value); setError("") }}
          onKeyDown={onKeyDown}
          disabled={adding}
        />
        <button
          className="seo-kw-add-btn"
          onClick={handleAdd}
          disabled={adding || !input.trim()}
        >
          {adding ? <span className="seo-kw-spin"/> : "Add"}
        </button>
      </div>

      {/* error */}
      {error && (
        <div className="seo-kw-error">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
          <button className="seo-kw-err-x" onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* keywords list */}
      {loading ? (
        <div className="seo-kw-loading">
          <span className="seo-kw-spin"/>Loading…
        </div>
      ) : keywords.length === 0 ? (
        <p className="seo-kw-empty">No keywords yet. Add some above to help search engines find this post.</p>
      ) : (
        <div className="seo-kw-tags">
          {keywords.map(k => (
            <span key={k.id} className={`seo-kw-tag ${deleting === k.id ? "seo-kw-tag--deleting" : ""}`}>
              <span className="seo-kw-tag-hash">#</span>
              {k.keyword}
              <button
                className="seo-kw-tag-x"
                onClick={() => handleDelete(k.id)}
                disabled={deleting === k.id}
                title="Remove keyword"
              >
                {deleting === k.id
                  ? <span className="seo-kw-spin seo-kw-spin--sm"/>
                  : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                }
              </button>
            </span>
          ))}
        </div>
      )}

      <style>{`
        .seo-kw{display:flex;flex-direction:column;gap:12px;font-family:var(--font,'DM Sans',-apple-system,sans-serif);}
        .seo-kw-hd{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,0.55);}
        .seo-kw-count{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;border-radius:8px;background:rgba(99,102,241,0.15);color:#a5b4fc;font-size:10px;font-weight:600;padding:0 4px;}
        .seo-kw-hint{margin-left:auto;font-size:11px;font-weight:400;text-transform:none;letter-spacing:0;color:rgba(255,255,255,0.22);}
        .seo-kw-input-row{display:flex;align-items:center;gap:0;background:#141420;border:1px solid rgba(255,255,255,0.06);border-radius:9px;overflow:hidden;transition:border-color .15s,box-shadow .15s;}
        .seo-kw-input-row:focus-within{border-color:rgba(99,102,241,0.45);box-shadow:0 0 0 3px rgba(99,102,241,0.1);}
        .seo-kw-input-row--err{border-color:rgba(248,113,113,0.4);}
        .seo-kw-input-icon{flex-shrink:0;color:rgba(255,255,255,0.25);margin-left:12px;}
        .seo-kw-input{flex:1;background:transparent;border:none;outline:none;font-family:inherit;font-size:13.5px;color:rgba(255,255,255,0.9);padding:10px 10px 10px 8px;caret-color:#a5b4fc;}
        .seo-kw-input::placeholder{color:rgba(255,255,255,0.2);}
        .seo-kw-input:disabled{opacity:.5;}
        .seo-kw-add-btn{flex-shrink:0;height:100%;padding:0 16px;background:#6366f1;border:none;border-left:1px solid rgba(99,102,241,0.3);color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;display:flex;align-items:center;justify-content:center;min-width:56px;align-self:stretch;}
        .seo-kw-add-btn:hover:not(:disabled){background:#4f52e8;}
        .seo-kw-add-btn:disabled{opacity:.45;cursor:not-allowed;}
        .seo-kw-error{display:flex;align-items:center;gap:7px;padding:8px 12px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.2);border-radius:8px;color:#fca5a5;font-size:12.5px;}
        .seo-kw-err-x{margin-left:auto;background:none;border:none;color:#fca5a5;font-size:16px;cursor:pointer;line-height:1;padding:0;}
        .seo-kw-loading{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,0.3);padding:4px 0;}
        .seo-kw-empty{font-size:13px;color:rgba(255,255,255,0.28);line-height:1.6;}
        .seo-kw-tags{display:flex;flex-wrap:wrap;gap:7px;}
        .seo-kw-tag{display:inline-flex;align-items:center;gap:4px;padding:4px 8px 4px 9px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.22);border-radius:20px;font-size:12.5px;font-weight:500;color:#a5b4fc;transition:opacity .15s;}
        .seo-kw-tag--deleting{opacity:.45;}
        .seo-kw-tag-hash{opacity:0.5;font-size:11px;}
        .seo-kw-tag-x{background:none;border:none;color:inherit;cursor:pointer;display:flex;align-items:center;opacity:0.55;padding:0 0 0 3px;transition:opacity .12s;flex-shrink:0;}
        .seo-kw-tag-x:hover:not(:disabled){opacity:1;}
        .seo-kw-tag-x:disabled{cursor:not-allowed;}
        .seo-kw-spin{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,0.15);border-top-color:currentColor;border-radius:50%;animation:seo-spin .6s linear infinite;flex-shrink:0;}
        .seo-kw-spin--sm{width:9px;height:9px;border-width:1.5px;}
        @keyframes seo-spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}