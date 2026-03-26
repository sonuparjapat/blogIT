"use client"

import { useEffect, useState } from "react"
import api from "@/lib/axios"

type Category = {
  id: number
  name: string
  slug: string
  postCount?: string | number
}

type Props = {
  selected: number[]
  onChange: (ids: number[]) => void
}

export default function CategoryPicker({ selected, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [search,     setSearch]     = useState("")
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    api.get("/categories")
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
        setCategories(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = search.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  const selectedCats = categories.filter(c => selected.includes(c.id))

  return (
    <div className="cp-root">

      {selectedCats.length > 0 && (
        <div className="cp-pills">
          {selectedCats.map(c => (
            <span key={c.id} className="cp-pill">
              {c.name}
              <button className="cp-pill-x" onClick={() => toggle(c.id)}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="cp-search-wrap">
        <svg className="cp-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          className="cp-search"
          placeholder="Filter categories…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="cp-search-clear" onClick={() => setSearch("")}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>

      <div className="cp-list">
        {loading ? (
          <div className="cp-loading"><span className="cp-spinner"/>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="cp-empty">{search ? `No match for "${search}"` : "No categories yet"}</div>
        ) : (
          filtered.map(cat => {
            const on = selected.includes(cat.id)
            const count = Number(cat.postCount ?? 0)   // ← fix: cast to number
            return (
              <button
                key={cat.id}
                type="button"
                className={`cp-item ${on ? "cp-item--on" : ""}`}
                onClick={() => toggle(cat.id)}
              >
                <span className={`cp-check ${on ? "cp-check--on" : ""}`}>
                  {on && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </span>
                <span className="cp-item-name">{cat.name}</span>
                {/* ← fix: always show count, cast to number */}
                <span className="cp-item-count">{count}</span>
              </button>
            )
          })
        )}
      </div>

      {selected.length > 0 && (
        <div className="cp-footer">
          {selected.length} categor{selected.length === 1 ? "y" : "ies"} selected
          <button className="cp-clear-all" onClick={() => onChange([])}>Clear all</button>
        </div>
      )}



      <style>{`
        .cp-root {
          background: var(--s1, #141420);
          border: 1px solid var(--b0, rgba(255,255,255,0.055));
          border-radius: 12px;
          overflow: hidden;
        }

        .cp-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 12px 14px 0;
        }
        .cp-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 500;
          padding: 3px 8px 3px 10px;
          border-radius: 20px;
          background: rgba(165,180,252,0.12);
          color: #a5b4fc;
          border: 1px solid rgba(165,180,252,0.2);
        }
        .cp-pill-x {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          opacity: 0.7;
          padding: 0;
          transition: opacity 0.12s;
        }
        .cp-pill-x:hover { opacity: 1; }

        .cp-search-wrap {
          position: relative;
          padding: 10px 12px;
          border-bottom: 1px solid var(--b0, rgba(255,255,255,0.055));
        }
        .cp-search-icon {
          position: absolute;
          left: 23px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.28);
          pointer-events: none;
        }
        .cp-search {
          width: 100%;
          height: 34px;
          padding: 0 30px 0 32px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          color: rgba(255,255,255,0.9);
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
        }
        .cp-search:focus { border-color: rgba(165,180,252,0.35); }
        .cp-search::placeholder { color: rgba(255,255,255,0.25); }
        .cp-search-clear {
          position: absolute;
          right: 22px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .cp-search-clear:hover { color: rgba(255,255,255,0.7); }

        .cp-list {
          max-height: 220px;
          overflow-y: auto;
          padding: 6px 0;
        }
        .cp-list::-webkit-scrollbar { width: 4px; }
        .cp-list::-webkit-scrollbar-thumb { background: rgba(165,180,252,0.2); border-radius: 4px; }

        .cp-loading, .cp-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 20px;
          font-size: 13px;
          color: rgba(255,255,255,0.28);
        }
        .cp-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: #a5b4fc;
          border-radius: 50%;
          animation: cp-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes cp-spin { to { transform: rotate(360deg); } }

        .cp-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
          font-family: inherit;
        }
        .cp-item:hover { background: rgba(255,255,255,0.04); }
        .cp-item--on { background: rgba(165,180,252,0.06); }
        .cp-item--on:hover { background: rgba(165,180,252,0.1); }

        .cp-check {
          width: 17px; height: 17px;
          border-radius: 5px;
          border: 1.5px solid rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.12s;
        }
        .cp-check--on {
          background: #a5b4fc;
          border-color: #a5b4fc;
          color: #1a1a28;
        }

        .cp-item-name {
          flex: 1;
          font-size: 13.5px;
          color: rgba(255,255,255,0.8);
          font-weight: 400;
        }
        .cp-item--on .cp-item-name {
          color: rgba(255,255,255,0.95);
          font-weight: 500;
        }

        .cp-item-count {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.06);
          padding: 1px 7px;
          border-radius: 10px;
        }

        .cp-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          border-top: 1px solid rgba(255,255,255,0.055);
          font-size: 11.5px;
          color: rgba(255,255,255,0.35);
        }
        .cp-clear-all {
          background: none;
          border: none;
          font-size: 11.5px;
          color: #a5b4fc;
          cursor: pointer;
          font-family: inherit;
          padding: 0;
          transition: opacity 0.12s;
        }
        .cp-clear-all:hover { opacity: 0.7; }
      `}</style>
    </div>
  )
}