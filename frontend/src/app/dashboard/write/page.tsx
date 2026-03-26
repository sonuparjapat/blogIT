"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import api from "@/lib/axios"
import PostEditor from "@/components/editor/PostEditor"

/* ─── helpers ─────────────────────────────────────────────────────────── */
function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
function countWords(json: any): number {
  if (!json) return 0
  try { return JSON.stringify(json).replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length } catch { return 0 }
}
function readingTime(json: any) { return Math.max(1, Math.ceil(countWords(json) / 200)) }

type Tab = "write" | "media" | "settings"
type ImgEntry = { file: File; preview: string }

/* ════════════════════════════════════════════════════════════════════════ */
export default function UserCreatePostPage() {
  const router = useRouter()

  const [title,       setTitle]       = useState("")
  const [slug,        setSlug]        = useState("")
  const [slugLocked,  setSlugLocked]  = useState(false)
  const [content,     setContent]     = useState<any>(null)
  const [excerpt,     setExcerpt]     = useState("")
  const [seoTitle,    setSeoTitle]    = useState("")
  const [seoDesc,     setSeoDesc]     = useState("")
  const [featuredFile,    setFeaturedFile]    = useState<File | null>(null)
  const [featuredPreview, setFeaturedPreview] = useState("")
  const [gallery,         setGallery]         = useState<ImgEntry[]>([])
  const galleryRef = useRef<HTMLInputElement>(null)

  const [tab,       setTab]       = useState<Tab>("write")
  const [saving,    setSaving]    = useState(false)
  const [saveState, setSaveState] = useState<"idle"|"saved"|"submitted"|"error">("idle")
  const [errorMsg,  setErrorMsg]  = useState("")

  const rt = readingTime(content)
  const wc = countWords(content)

  useEffect(() => {
    if (!slugLocked && title) setSlug(slugify(title))
  }, [title, slugLocked])

  /* ── media ── */
  function handleFeatured(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setFeaturedFile(f); setFeaturedPreview(URL.createObjectURL(f)); e.target.value = ""
  }
  function addGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []); e.target.value = ""
    setGallery(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
  }

  /* ── save draft ── */
  const saveDraft = useCallback(async () => {
    if (!title.trim()) { setErrorMsg("Title is required."); setSaveState("error"); return }
    setErrorMsg(""); setSaving(true); setSaveState("idle")
    try {
      const fd = new FormData()
      fd.append("title",           title.trim())
      fd.append("slug",            slug || slugify(title))
      fd.append("excerpt",         excerpt)
      fd.append("content",         JSON.stringify(content))
      fd.append("seo_title",       seoTitle)
      fd.append("seo_description", seoDesc)
      fd.append("status",          "draft")
      fd.append("reading_time",    String(rt))
      if (featuredFile) fd.append("featured_image", featuredFile)
      gallery.forEach(g => fd.append("gallery_images", g.file))

      await api.post("/posts", fd, { headers: { "Content-Type": "multipart/form-data" } })
      setSaveState("saved")
      setTimeout(() => router.push("/dashboard/posts"), 1200)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to save. Please try again.")
      setSaveState("error")
    } finally { setSaving(false) }
  }, [title, slug, excerpt, content, seoTitle, seoDesc, rt, featuredFile, gallery, router])

  /* ── submit for review ── */
  const submitForReview = useCallback(async () => {
    if (!title.trim())   { setErrorMsg("Title is required."); setSaveState("error"); return }
    if (!content)        { setErrorMsg("Please write some content before submitting."); setSaveState("error"); return }
    if (wc < 50)         { setErrorMsg("Post is too short. Write at least 50 words."); setSaveState("error"); return }
    setErrorMsg(""); setSaving(true); setSaveState("idle")
    try {
      const fd = new FormData()
      fd.append("title",           title.trim())
      fd.append("slug",            slug || slugify(title))
      fd.append("excerpt",         excerpt)
      fd.append("content",         JSON.stringify(content))
      fd.append("seo_title",       seoTitle)
      fd.append("seo_description", seoDesc)
      fd.append("status",          "pending")   // backend enforces this — published is blocked for users
      fd.append("reading_time",    String(rt))
      if (featuredFile) fd.append("featured_image", featuredFile)
      gallery.forEach(g => fd.append("gallery_images", g.file))

      await api.post("/posts", fd, { headers: { "Content-Type": "multipart/form-data" } })
      setSaveState("submitted")
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Submission failed. Please try again.")
      setSaveState("error")
    } finally { setSaving(false) }
  }, [title, slug, excerpt, content, seoTitle, seoDesc, rt, wc, featuredFile, gallery])

  /* ── ⌘S = save draft ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); saveDraft() } }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h)
  }, [saveDraft])

  /* ── submitted success screen ── */
  if (saveState === "submitted") return (
    <div className="ucp ucp-success-screen">
      <div className="ucp-success-card">
        <div className="ucp-success-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h2 className="ucp-success-title">Submitted for review!</h2>
        <p className="ucp-success-sub">
          Your post <strong>"{title}"</strong> has been submitted.<br/>
          An editor will review it and publish it soon. We'll notify you when it goes live.
        </p>
        <div className="ucp-success-actions">
          <Link href="/dashboard/posts" className="ucp-btn ucp-btn--primary">View my posts</Link>
          <button className="ucp-btn ucp-btn--ghost" onClick={() => { setSaveState("idle"); setTitle(""); setContent(null); setSlug(""); setExcerpt(""); setSeoTitle(""); setSeoDesc(""); setFeaturedFile(null); setFeaturedPreview(""); setGallery([]); }}>
            Write another
          </button>
        </div>
      </div>
      <style>{styles}</style>
    </div>
  )

  return (
    <div className="ucp">

      {/* ── Topbar ── */}
      <header className="ucp-bar">
        <div className="ucp-bar-l">
          <Link href="/dashboard" className="ucp-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Dashboard
          </Link>
          <span className="ucp-sep"/>
          <span className="ucp-crumb">New post</span>
        </div>

        {/* tabs */}
        <nav className="ucp-nav">
          {(["write","media","settings"] as Tab[]).map(t => (
            <button key={t} className={`ucp-nav-btn ${tab===t?"ucp-nav-btn--on":""}`} onClick={() => setTab(t)}>
              {tabIcon(t)}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t==="media" && (gallery.length + (featuredFile?1:0)) > 0 && (
                <span className="ucp-badge">{gallery.length + (featuredFile?1:0)}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="ucp-bar-r">
          <span className="ucp-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {rt}m · {wc}w
          </span>
          <button className="ucp-draft-btn" onClick={saveDraft} disabled={saving}>
            {saving && saveState!=="error" ? <><span className="ucp-spin"/>Saving…</> : "Save draft"}
          </button>
          <button className="ucp-submit-btn" onClick={submitForReview} disabled={saving}>
            {saving
              ? <><span className="ucp-spin"/>Submitting…</>
              : <>Submit for review <span className="ucp-kbd">⌘S</span></>
            }
          </button>
        </div>
      </header>

      {/* ── Error banner ── */}
      {saveState==="error" && errorMsg && (
        <div className="ucp-err-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {errorMsg}
          <button onClick={() => { setSaveState("idle"); setErrorMsg("") }} className="ucp-err-x">×</button>
        </div>
      )}

      <main className="ucp-main">

        {/* ══ WRITE ══ */}
        {tab==="write" && (
          <div className="ucp-write">
            <textarea
              className="ucp-title-inp"
              placeholder="Post title…"
              value={title}
              rows={1}
              onChange={e => setTitle(e.target.value)}
              onInput={e => { const el = e.currentTarget; el.style.height="auto"; el.style.height=el.scrollHeight+"px" }}
            />
            <div className="ucp-slug-row">
              <span className="ucp-slug-base">yoursite.com/blog/</span>
              <input
                className="ucp-slug-inp"
                value={slug}
                placeholder="auto-slug"
                onChange={e => { setSlug(e.target.value); setSlugLocked(true) }}
              />
              {slugLocked && (
                <button className="ucp-slug-auto" onClick={() => { setSlugLocked(false); setSlug(slugify(title)) }}>↺ auto</button>
              )}
            </div>

            <div className="ucp-editor-wrap">
              <PostEditor content={content} onChange={setContent}/>
            </div>

            <div className="ucp-field">
              <label className="ucp-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="15" y1="18" x2="3" y2="18"/></svg>
                Excerpt
                <span className="ucp-label-hint">Shown in listings and previews</span>
              </label>
              <textarea
                className="ucp-ta"
                placeholder="A short compelling summary…"
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                rows={3}
              />
              <span className="ucp-charcount" style={{ color: excerpt.length>300?"#f87171":"" }}>{excerpt.length}/300</span>
            </div>

            <div className="ucp-field" style={{marginTop:20}}>
              <label className="ucp-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                SEO title
                <span className="ucp-charcount" style={{marginLeft:"auto", color: seoTitle.length>60?"#f87171":""}}>{seoTitle.length}/60</span>
              </label>
              <input className="ucp-inp" placeholder="Leave blank to use post title" value={seoTitle} onChange={e => setSeoTitle(e.target.value)}/>
            </div>
            <div className="ucp-field" style={{marginTop:16}}>
              <label className="ucp-label">
                Meta description
                <span className="ucp-charcount" style={{marginLeft:"auto", color: seoDesc.length>160?"#f87171":""}}>{seoDesc.length}/160</span>
              </label>
              <textarea className="ucp-ta" placeholder="Leave blank to use excerpt" value={seoDesc} onChange={e => setSeoDesc(e.target.value)} rows={3}/>
            </div>

            {/* SEO health chips */}
            <div className="ucp-chips">
              {[
                { ok: title.length>=10,       label:"Title"         },
                { ok: !!excerpt,              label:"Excerpt"       },
                { ok: wc>=100,                label:"100+ words"    },
                { ok: !!featuredPreview,      label:"Featured image"},
              ].map(c => (
                <span key={c.label} className={`ucp-chip ${c.ok?"ucp-chip--ok":"ucp-chip--warn"}`}>
                  {c.ok?"✓":"!"} {c.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ══ MEDIA ══ */}
        {tab==="media" && (
          <div className="ucp-panel">
            <div className="ucp-panel-hd">
              <h2 className="ucp-panel-title">Media</h2>
              <p className="ucp-panel-sub">Add a featured image and optional gallery photos.</p>
            </div>

            <div className="ucp-section">
              <div className="ucp-section-label">Featured image</div>
              {featuredPreview ? (
                <div className="ucp-featured">
                  <img src={featuredPreview} alt="" className="ucp-featured-img"/>
                  <div className="ucp-featured-overlay">
                    <label className="ucp-ov-btn">
                      Replace
                      <input type="file" accept="image/*" hidden onChange={handleFeatured}/>
                    </label>
                    <button className="ucp-ov-btn ucp-ov-btn--danger" onClick={() => { setFeaturedFile(null); setFeaturedPreview("") }}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="ucp-dropzone">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{color:"var(--t2)"}}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span className="ucp-drop-title">Drop image or click to browse</span>
                  <span className="ucp-drop-sub">PNG, JPG, WebP · max 10 MB</span>
                  <input type="file" accept="image/*" hidden onChange={handleFeatured}/>
                </label>
              )}
            </div>

            <div className="ucp-section">
              <div className="ucp-section-label">
                Gallery
                {gallery.length > 0 && <span className="ucp-count-badge">{gallery.length}</span>}
              </div>
              <div className="ucp-gallery">
                {gallery.map((g,i) => (
                  <div key={i} className="ucp-gallery-item">
                    <img src={g.preview} alt="" className="ucp-gallery-img"/>
                    <button className="ucp-gallery-rm" onClick={() => setGallery(p => p.filter((_,j) => j!==i))}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
                <label className="ucp-gallery-add">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={addGallery}/>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {tab==="settings" && (
          <div className="ucp-panel">
            <div className="ucp-panel-hd">
              <h2 className="ucp-panel-title">Post info</h2>
              <p className="ucp-panel-sub">Review your post before submitting for editorial review.</p>
            </div>

            <div className="ucp-info-grid">

              {/* overview stats */}
              <div className="ucp-card">
                <div className="ucp-card-title">Overview</div>
                <div className="ucp-overview">
                  {[
                    { n: rt,               l: "min read" },
                    { n: wc.toLocaleString(), l: "words"  },
                    { n: gallery.length + (featuredFile?1:0), l: "media" },
                  ].map((s,i) => (
                    <div key={i} className="ucp-overview-stat">
                      <div className="ucp-overview-n">{s.n}</div>
                      <div className="ucp-overview-l">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* review process info */}
              <div className="ucp-card">
                <div className="ucp-card-title">How publishing works</div>
                <div className="ucp-steps">
                  {[
                    { n:"1", label:"Save draft",         hint:"Work on your post at your own pace"     },
                    { n:"2", label:"Submit for review",  hint:"Send it to our editorial team"          },
                    { n:"3", label:"Editorial review",   hint:"We check quality, formatting and SEO"   },
                    { n:"4", label:"Goes live",          hint:"Published when approved by an editor"   },
                  ].map(s => (
                    <div key={s.n} className="ucp-step">
                      <div className="ucp-step-n">{s.n}</div>
                      <div>
                        <div className="ucp-step-label">{s.label}</div>
                        <div className="ucp-step-hint">{s.hint}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* readiness checklist */}
              <div className="ucp-card ucp-card--full">
                <div className="ucp-card-title">Submission checklist</div>
                <div className="ucp-checklist">
                  {[
                    { ok: title.length>=10,             label:"Title is at least 10 characters"     },
                    { ok: !!excerpt,                    label:"Excerpt is filled in"                },
                    { ok: wc>=100,                      label:"Post has at least 100 words"         },
                    { ok: !!featuredPreview,            label:"Featured image is uploaded"          },
                    { ok: seoTitle.length>0 || title.length>0, label:"SEO title is set"            },
                    { ok: (seoDesc||excerpt).length>=50, label:"Meta description is 50+ characters" },
                  ].map(c => (
                    <div key={c.label} className={`ucp-check ${c.ok?"ucp-check--ok":"ucp-check--warn"}`}>
                      <div className={`ucp-check-icon ${c.ok?"ucp-check-icon--ok":"ucp-check-icon--warn"}`}>
                        {c.ok
                          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        }
                      </div>
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="ucp-save-row">
              <button className="ucp-save-draft" onClick={saveDraft} disabled={saving}>Save as draft</button>
              <button className="ucp-save-submit" onClick={submitForReview} disabled={saving}>
                {saving ? "Submitting…" : "Submit for review →"}
              </button>
            </div>
          </div>
        )}

      </main>

      <style>{styles}</style>
    </div>
  )
}

function tabIcon(t: Tab) {
  const s = { width:12, height:12, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:"2.2", strokeLinecap:"round" as const, strokeLinejoin:"round" as const }
  if (t==="write")    return <svg {...s}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  if (t==="media")    return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  if (t==="settings") return <svg {...s}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  return null
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --bg:#09090e;--s0:#0f0f17;--s1:#141420;--s2:#1a1a28;
    --b0:rgba(255,255,255,0.06);--b1:rgba(255,255,255,0.11);
    --t0:rgba(255,255,255,0.92);--t1:rgba(255,255,255,0.55);
    --t2:rgba(255,255,255,0.28);--t3:rgba(255,255,255,0.12);
    --acc:#6366f1;--acc-l:#a5b4fc;--acc-a:rgba(99,102,241,0.15);--acc-b:rgba(99,102,241,0.28);
    --grn:#34d399;--grn-a:rgba(52,211,153,0.12);
    --amb:#fbbf24;--amb-a:rgba(251,191,36,0.12);
    --red:#f87171;--red-a:rgba(248,113,113,0.12);
    --font:'DM Sans',-apple-system,sans-serif;--r:10px;--tr:0.16s cubic-bezier(0.4,0,0.2,1);
  }
  .ucp{font-family:var(--font);background:var(--bg);color:var(--t0);min-height:100vh;display:flex;flex-direction:column;animation:ucp-in .3s ease both;}
  @keyframes ucp-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes ucp-spin-a{to{transform:rotate(360deg)}}

  /* topbar */
  .ucp-bar{display:flex;align-items:center;gap:14px;height:54px;padding:0 20px;border-bottom:1px solid var(--b0);background:rgba(9,9,14,.9);backdrop-filter:blur(20px);position:sticky;top:0;z-index:300;flex-shrink:0;}
  .ucp-bar-l{display:flex;align-items:center;gap:8px;flex:1;min-width:0;}
  .ucp-bar-r{display:flex;align-items:center;gap:8px;flex-shrink:0;}
  .ucp-back{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:var(--t1);text-decoration:none;white-space:nowrap;transition:color var(--tr);}
  .ucp-back:hover{color:var(--t0);}
  .ucp-sep{width:1px;height:13px;background:var(--b1);}
  .ucp-crumb{font-size:12.5px;font-weight:500;color:var(--t0);}
  .ucp-nav{display:flex;background:var(--s1);border:1px solid var(--b0);border-radius:8px;padding:3px;gap:1px;}
  .ucp-nav-btn{display:inline-flex;align-items:center;gap:5px;font-family:var(--font);font-size:12px;font-weight:500;color:var(--t1);background:transparent;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;transition:background var(--tr),color var(--tr);white-space:nowrap;}
  .ucp-nav-btn:hover{color:var(--t0);background:rgba(255,255,255,.04);}
  .ucp-nav-btn--on{background:var(--s0);color:var(--t0);box-shadow:inset 0 0 0 1px var(--b0);}
  .ucp-badge{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;border-radius:8px;background:var(--acc-a);color:var(--acc-l);font-size:10px;font-weight:600;padding:0 4px;}
  .ucp-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;padding:4px 10px;border-radius:20px;background:rgba(255,255,255,.05);color:var(--t1);white-space:nowrap;}
  .ucp-draft-btn{display:inline-flex;align-items:center;gap:6px;font-family:var(--font);font-size:12.5px;font-weight:500;color:var(--t1);background:rgba(255,255,255,.07);border:1px solid var(--b0);border-radius:8px;padding:7px 14px;cursor:pointer;white-space:nowrap;transition:background var(--tr),color var(--tr);}
  .ucp-draft-btn:hover:not(:disabled){background:rgba(255,255,255,.11);color:var(--t0);}
  .ucp-draft-btn:disabled{opacity:.5;cursor:not-allowed;}
  .ucp-submit-btn{display:inline-flex;align-items:center;gap:6px;font-family:var(--font);font-size:13px;font-weight:600;color:#fff;background:var(--grn);border:none;border-radius:8px;padding:7px 18px;cursor:pointer;white-space:nowrap;box-shadow:0 4px 16px rgba(52,211,153,.3);transition:background var(--tr),transform var(--tr);}
  .ucp-submit-btn:hover:not(:disabled){background:#2dd4a0;transform:translateY(-1px);}
  .ucp-submit-btn:disabled{opacity:.6;cursor:not-allowed;}
  .ucp-kbd{font-size:10px;background:rgba(255,255,255,.15);padding:1px 5px;border-radius:3px;}
  .ucp-spin{width:12px;height:12px;border:2px solid rgba(255,255,255,.25);border-top-color:currentColor;border-radius:50%;animation:ucp-spin-a .6s linear infinite;flex-shrink:0;}
  .ucp-err-banner{display:flex;align-items:center;gap:10px;padding:10px 20px;background:var(--red-a);border-bottom:1px solid rgba(248,113,113,.2);color:#fca5a5;font-size:13.5px;}
  .ucp-err-x{margin-left:auto;background:none;border:none;color:#fca5a5;font-size:20px;cursor:pointer;line-height:1;padding:0;}

  /* main */
  .ucp-main{flex:1;overflow-y:auto;}
  .ucp-write{max-width:780px;margin:0 auto;padding:48px 28px 100px;}
  .ucp-panel{max-width:820px;margin:0 auto;padding:44px 28px 100px;}
  .ucp-panel-hd{margin-bottom:32px;padding-bottom:22px;border-bottom:1px solid var(--b0);}
  .ucp-panel-title{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(22px,4vw,30px);color:var(--t0);letter-spacing:-.025em;margin-bottom:5px;}
  .ucp-panel-sub{font-size:13.5px;color:var(--t1);line-height:1.6;}

  /* write tab */
  .ucp-title-inp{width:100%;background:transparent;border:none;outline:none;resize:none;overflow:hidden;font-family:'Syne',sans-serif;font-size:clamp(28px,5vw,48px);font-weight:800;line-height:1.15;color:var(--t0);letter-spacing:-.03em;caret-color:var(--acc-l);}
  .ucp-title-inp::placeholder{color:var(--t3);}
  .ucp-slug-row{display:flex;align-items:center;gap:0;margin-top:12px;margin-bottom:28px;padding:6px 12px;background:var(--s1);border:1px solid var(--b0);border-radius:7px;font-size:12px;}
  .ucp-slug-base{color:var(--t2);flex-shrink:0;white-space:nowrap;}
  .ucp-slug-inp{flex:1;background:transparent;border:none;outline:none;font-size:12px;font-family:var(--font);color:var(--acc-l);min-width:0;}
  .ucp-slug-auto{font-size:11px;color:var(--t2);background:rgba(255,255,255,.06);border:1px solid var(--b0);border-radius:4px;padding:2px 7px;cursor:pointer;font-family:var(--font);flex-shrink:0;margin-left:8px;}
  .ucp-slug-auto:hover{color:var(--t0);}
  .ucp-editor-wrap{background:var(--s0);border:1px solid var(--b0);border-radius:12px;overflow:hidden;margin-bottom:32px;}
  .ucp-editor-wrap:focus-within{border-color:var(--acc-b);box-shadow:0 0 0 3px var(--acc-a);}
  .ucp-field{display:flex;flex-direction:column;gap:8px;}
  .ucp-label{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--t1);}
  .ucp-label-hint{margin-left:auto;font-weight:400;font-size:11px;text-transform:none;letter-spacing:0;color:var(--t2);}
  .ucp-ta{width:100%;background:var(--s1);border:1px solid var(--b0);border-radius:8px;color:var(--t0);font-family:var(--font);font-size:14px;padding:10px 14px;outline:none;resize:vertical;min-height:80px;line-height:1.65;transition:border-color var(--tr),box-shadow var(--tr);}
  .ucp-ta:focus{border-color:var(--acc-b);box-shadow:0 0 0 3px var(--acc-a);}
  .ucp-ta::placeholder{color:var(--t3);}
  .ucp-inp{width:100%;background:var(--s1);border:1px solid var(--b0);border-radius:8px;color:var(--t0);font-family:var(--font);font-size:14px;padding:10px 14px;outline:none;transition:border-color var(--tr),box-shadow var(--tr);}
  .ucp-inp:focus{border-color:var(--acc-b);box-shadow:0 0 0 3px var(--acc-a);}
  .ucp-charcount{font-size:11px;color:var(--t2);text-align:right;margin-top:-4px;}
  .ucp-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:20px;}
  .ucp-chip{font-size:11.5px;font-weight:500;padding:3px 10px;border-radius:20px;}
  .ucp-chip--ok{background:var(--grn-a);color:var(--grn);}
  .ucp-chip--warn{background:var(--amb-a);color:var(--amb);}

  /* media */
  .ucp-section{margin-bottom:36px;}
  .ucp-section-label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--t1);margin-bottom:12px;}
  .ucp-count-badge{background:var(--acc-a);color:var(--acc-l);border-radius:10px;font-size:10px;padding:1px 7px;font-weight:700;}
  .ucp-dropzone{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:200px;border:1.5px dashed rgba(255,255,255,.09);border-radius:12px;cursor:pointer;transition:background var(--tr),border-color var(--tr);}
  .ucp-dropzone:hover{background:rgba(255,255,255,.02);border-color:var(--acc-b);}
  .ucp-drop-title{font-size:14px;font-weight:500;color:var(--t1);}
  .ucp-drop-sub{font-size:12px;color:var(--t2);}
  .ucp-featured{position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--b0);}
  .ucp-featured-img{width:100%;height:240px;object-fit:cover;display:block;}
  .ucp-featured-overlay{position:absolute;top:10px;right:10px;display:flex;gap:8px;}
  .ucp-ov-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-family:var(--font);font-weight:500;padding:7px 13px;border-radius:8px;cursor:pointer;border:none;background:rgba(0,0,0,.55);color:#fff;backdrop-filter:blur(8px);}
  .ucp-ov-btn--danger{color:#fca5a5;}
  .ucp-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;}
  .ucp-gallery-item{position:relative;border-radius:10px;overflow:hidden;border:1px solid var(--b0);aspect-ratio:1;}
  .ucp-gallery-img{width:100%;height:100%;object-fit:cover;display:block;}
  .ucp-gallery-rm{position:absolute;top:5px;right:5px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.7);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity var(--tr);}
  .ucp-gallery-item:hover .ucp-gallery-rm{opacity:1;}
  .ucp-gallery-add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;aspect-ratio:1;border-radius:10px;border:1.5px dashed rgba(255,255,255,.09);cursor:pointer;color:var(--t2);font-size:11px;transition:background var(--tr),border-color var(--tr),color var(--tr);}
  .ucp-gallery-add:hover{border-color:var(--acc-b);color:var(--acc-l);}

  /* settings */
  .ucp-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;}
  .ucp-card{background:var(--s0);border:1px solid var(--b0);border-radius:var(--r);padding:20px 22px;}
  .ucp-card--full{grid-column:span 2;}
  .ucp-card-title{font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--t1);margin-bottom:14px;}
  .ucp-overview{display:flex;border:1px solid var(--b0);border-radius:8px;overflow:hidden;}
  .ucp-overview-stat{flex:1;text-align:center;padding:10px 6px;border-right:1px solid var(--b0);}
  .ucp-overview-stat:last-child{border-right:none;}
  .ucp-overview-n{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--t0);}
  .ucp-overview-l{font-size:10px;color:var(--t1);margin-top:2px;}
  .ucp-steps{display:flex;flex-direction:column;gap:12px;}
  .ucp-step{display:flex;align-items:flex-start;gap:12px;}
  .ucp-step-n{width:22px;height:22px;border-radius:50%;background:var(--acc-a);color:var(--acc-l);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;}
  .ucp-step-label{font-size:13.5px;font-weight:500;color:var(--t0);margin-bottom:2px;}
  .ucp-step-hint{font-size:12px;color:var(--t2);}
  .ucp-checklist{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .ucp-check{display:flex;align-items:center;gap:9px;font-size:13px;padding:10px 12px;border-radius:8px;}
  .ucp-check--ok{background:var(--grn-a);color:rgba(255,255,255,.75);}
  .ucp-check--warn{background:rgba(255,255,255,.04);color:var(--t1);}
  .ucp-check-icon{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .ucp-check-icon--ok{background:var(--grn);color:#042f1e;}
  .ucp-check-icon--warn{background:rgba(255,255,255,.1);color:var(--t2);}
  .ucp-save-row{display:flex;gap:12px;}
  .ucp-save-draft{flex:1;padding:13px;font-family:var(--font);font-size:14px;font-weight:600;color:var(--t1);background:rgba(255,255,255,.06);border:1px solid var(--b0);border-radius:var(--r);cursor:pointer;transition:background var(--tr),color var(--tr);}
  .ucp-save-draft:hover:not(:disabled){background:rgba(255,255,255,.1);color:var(--t0);}
  .ucp-save-draft:disabled{opacity:.5;cursor:not-allowed;}
  .ucp-save-submit{flex:2;padding:13px;font-family:var(--font);font-size:14px;font-weight:700;color:#042f1e;background:var(--grn);border:none;border-radius:var(--r);cursor:pointer;box-shadow:0 4px 20px rgba(52,211,153,.3);transition:background var(--tr),transform var(--tr);}
  .ucp-save-submit:hover:not(:disabled){background:#2dd4a0;transform:translateY(-1px);}
  .ucp-save-submit:disabled{opacity:.6;cursor:not-allowed;}

  /* success */
  .ucp-success-screen{align-items:center;justify-content:center;}
  .ucp-success-card{background:var(--s1);border:1px solid var(--b0);border-radius:20px;padding:52px 40px;max-width:500px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px;}
  .ucp-success-icon{width:64px;height:64px;border-radius:50%;background:var(--grn-a);color:var(--grn);display:flex;align-items:center;justify-content:center;}
  .ucp-success-title{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--t0);letter-spacing:-.02em;}
  .ucp-success-sub{font-size:14.5px;color:var(--t1);line-height:1.7;}
  .ucp-success-sub strong{color:var(--t0);}
  .ucp-success-actions{display:flex;gap:12px;width:100%;}
  .ucp-btn{flex:1;padding:12px 20px;border-radius:10px;font-family:var(--font);font-size:14px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border:none;transition:all var(--tr);}
  .ucp-btn--primary{background:var(--grn);color:#042f1e;box-shadow:0 4px 16px rgba(52,211,153,.3);}
  .ucp-btn--primary:hover{background:#2dd4a0;transform:translateY(-1px);}
  .ucp-btn--ghost{background:rgba(255,255,255,.06);color:var(--t1);border:1px solid var(--b0);}
  .ucp-btn--ghost:hover{background:rgba(255,255,255,.1);color:var(--t0);}

  @media(max-width:640px){
    .ucp-info-grid{grid-template-columns:1fr;}
    .ucp-card--full{grid-column:1;}
    .ucp-checklist{grid-template-columns:1fr;}
    .ucp-write,.ucp-panel{padding:24px 16px 80px;}
    .ucp-success-card{padding:36px 20px;}
    .ucp-bar{padding:0 12px;gap:8px;}
    .ucp-pill{display:none;}
  }
`