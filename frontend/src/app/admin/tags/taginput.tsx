"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import api from "@/lib/axios"

type Tag = { id: number; name: string; slug: string }

type Props = {
  value: string[]           // array of tag names
  onChange: (names: string[]) => void
}

export default function TagInput({ value, onChange }: Props) {
  const [input,       setInput]       = useState("")
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [allTags,     setAllTags]     = useState<Tag[]>([])
  const [focused,     setFocused]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  /* fetch all existing tags once for autocomplete */
  useEffect(() => {
    api.get("/tags")
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
        setAllTags(data)
      })
      .catch(() => {})
  }, [])

  /* filter suggestions */
  useEffect(() => {
    const q = input.trim().toLowerCase()
    if (!q) { setSuggestions([]); return }
    setSuggestions(
      allTags
        .filter(t =>
          t.name.toLowerCase().includes(q) &&
          !value.map(v => v.toLowerCase()).includes(t.name.toLowerCase())
        )
        .slice(0, 6)
    )
  }, [input, allTags, value])

  /* add a tag */
  const addTag = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    // prevent duplicates (case-insensitive)
    if (value.map(v => v.toLowerCase()).includes(trimmed.toLowerCase())) {
      setInput("")
      return
    }
    onChange([...value, trimmed])
    setInput("")
    setSuggestions([])
    inputRef.current?.focus()
  }, [value, onChange])

  /* remove a tag */
  const removeTag = (name: string) => {
    onChange(value.filter(v => v !== name))
  }

  /* keyboard handler */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="ti-root">
      {/* tag pills + input */}
      <div
        className={`ti-field ${focused ? "ti-field--focused" : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(tag => (
          <span key={tag} className="ti-tag">
            <span className="ti-tag-hash">#</span>
            {tag}
            <button
              type="button"
              className="ti-tag-x"
              onClick={e => { e.stopPropagation(); removeTag(tag) }}
              title="Remove"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          className="ti-input"
          placeholder={value.length === 0 ? "Add tags… (press Enter or comma)" : "Add more…"}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => { setTimeout(() => setFocused(false), 150) }}
        />
      </div>

      {/* suggestions dropdown */}
      {focused && suggestions.length > 0 && (
        <div className="ti-suggestions">
          {suggestions.map(tag => (
            <button
              key={tag.id}
              type="button"
              className="ti-suggestion"
              onMouseDown={e => { e.preventDefault(); addTag(tag.name) }}
            >
              <span className="ti-sug-hash">#</span>
              <span className="ti-sug-name">{tag.name}</span>
              <span className="ti-sug-hint">existing</span>
            </button>
          ))}
          {/* option to create new if no exact match */}
          {input.trim() && !suggestions.find(t => t.name.toLowerCase() === input.trim().toLowerCase()) && (
            <button
              type="button"
              className="ti-suggestion ti-suggestion--new"
              onMouseDown={e => { e.preventDefault(); addTag(input.trim()) }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Create <strong>"{input.trim()}"</strong></span>
            </button>
          )}
        </div>
      )}

      {/* hint */}
      <p className="ti-hint">Press Enter or comma to add · Backspace to remove last</p>

      <style>{`
        .ti-root {
          position: relative;
          font-family: inherit;
        }

        .ti-field {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          min-height: 42px;
          padding: 6px 12px;
          background: var(--s1, #141420);
          border: 1px solid var(--b0, rgba(255,255,255,0.055));
          border-radius: 10px;
          cursor: text;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ti-field--focused {
          border-color: rgba(165,180,252,0.4);
          box-shadow: 0 0 0 3px rgba(165,180,252,0.08);
        }

        .ti-tag {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px 7px 3px 6px;
          background: rgba(165,180,252,0.12);
          border: 1px solid rgba(165,180,252,0.22);
          border-radius: 20px;
          font-size: 12.5px;
          font-weight: 500;
          color: #a5b4fc;
          white-space: nowrap;
          user-select: none;
        }
        .ti-tag-hash {
          opacity: 0.55;
          font-size: 11px;
        }
        .ti-tag-x {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          opacity: 0.6;
          padding: 0 0 0 2px;
          margin-left: 1px;
          transition: opacity 0.12s;
        }
        .ti-tag-x:hover { opacity: 1; }

        .ti-input {
          flex: 1;
          min-width: 120px;
          background: transparent;
          border: none;
          outline: none;
          font-size: 13.5px;
          font-family: inherit;
          color: rgba(255,255,255,0.9);
          caret-color: #a5b4fc;
          padding: 2px 0;
        }
        .ti-input::placeholder { color: rgba(255,255,255,0.22); }

        .ti-suggestions {
          position: absolute;
          top: calc(100% + 4px);
          left: 0; right: 0;
          background: #1a1a28;
          border: 1px solid rgba(165,180,252,0.18);
          border-radius: 10px;
          overflow: hidden;
          z-index: 100;
          box-shadow: 0 8px 24px rgba(0,0,0,0.45);
        }

        .ti-suggestion {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          font-size: 13.5px;
          color: rgba(255,255,255,0.8);
          transition: background 0.1s;
        }
        .ti-suggestion:hover { background: rgba(165,180,252,0.08); }
        .ti-suggestion + .ti-suggestion { border-top: 1px solid rgba(255,255,255,0.05); }

        .ti-sug-hash { color: #a5b4fc; opacity: 0.6; font-size: 12px; }
        .ti-sug-name { flex: 1; }
        .ti-sug-hint {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.06);
          padding: 1px 6px;
          border-radius: 8px;
        }

        .ti-suggestion--new {
          color: #a5b4fc;
          gap: 7px;
        }
        .ti-suggestion--new strong { font-weight: 600; }

        .ti-hint {
          font-size: 11px;
          color: rgba(255,255,255,0.22);
          margin-top: 6px;
        }
      `}</style>
    </div>
  )
}