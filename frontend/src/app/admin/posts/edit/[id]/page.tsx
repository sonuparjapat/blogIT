"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import api from "@/lib/axios"
import PostEditor from "@/components/editor/PostEditor"
import CategoryPicker from "@/app/admin/categories/CategoryPicker"
import TagInput from "@/app/admin/tags/taginput"
import SeoKeywords from "@/components/admin/SeoKeywords"

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
function fmtBytes(n: number) { return n < 1024*1024 ? `${(n/1024).toFixed(0)} KB` : `${(n/1024/1024).toFixed(2)} MB` }

type Tab    = "write" | "media" | "seo" | "settings"
type Status = "draft" | "published"
type NewImg = { file: File; preview: string }
type ExistingImg = { id: number; image_url: string }

/* ════════════════════════════════════════════════════════════════════════ */
export default function EditPostPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params?.id as string

  /* ── loading ── */
  const [pageLoading, setPageLoading] = useState(true)
  const [loadError,   setLoadError]   = useState("")

  /* ── core fields ── */
  const [title,       setTitle]       = useState("")
  const [slug,        setSlug]        = useState("")
  const [slugLocked,  setSlugLocked]  = useState(true)
  const [content,     setContent]     = useState<any>(null)
  const [excerpt,     setExcerpt]     = useState("")

  /* ── taxonomy ── */
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [selectedTags,       setSelectedTags]       = useState<string[]>([])

  /* ── media — existing from server ── */
  const [existingFeatured,    setExistingFeatured]    = useState("")
  const [removeFeaturedFlag,  setRemoveFeaturedFlag]  = useState(false)
  const [existingGallery,     setExistingGallery]     = useState<ExistingImg[]>([])
  const [removedGalleryIds,   setRemovedGalleryIds]   = useState<number[]>([])

  /* ── media — new uploads ── */
  const [newFeaturedFile,    setNewFeaturedFile]    = useState<File | null>(null)
  const [newFeaturedPreview, setNewFeaturedPreview] = useState("")
  const [newGallery,         setNewGallery]         = useState<NewImg[]>([])
  const galleryInputRef = useRef<HTMLInputElement>(null)

  /* ── meta ── */
  const [seoTitle,    setSeoTitle]    = useState("")
  const [seoDesc,     setSeoDesc]     = useState("")
  const [status,      setStatus]      = useState<Status>("draft")
  const [isPremium,   setIsPremium]   = useState(false)
  const [scheduledAt, setScheduledAt] = useState("")

  /* ── ui ── */
  const [tab,       setTab]       = useState<Tab>("write")
  const [saving,    setSaving]    = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle")
  const [errorMsg,  setErrorMsg]  = useState("")

  /* ── derived ── */
  const rt            = readingTime(content)
  const wc            = countWords(content)
  const seoTitleFinal = seoTitle || title
  const seoDescFinal  = seoDesc  || excerpt

  /* displayed featured: new upload > existing (if not removed) */
  const shownFeatured = newFeaturedPreview || (removeFeaturedFlag ? "" : existingFeatured)

  /* gallery counts */
  const existingShown = existingGallery.filter(g => !removedGalleryIds.includes(g.id))
  const mediaBadge    = existingShown.length + newGallery.length + (shownFeatured ? 1 : 0)
  const taxonomyBadge = selectedCategories.length + selectedTags.length

  /* ── LOAD post ── */
  useEffect(() => {
    if (!postId) return
    setPageLoading(true)
    api.get(`/posts/id/${postId}`)
      .then(res => {
        const p = res.data?.data ?? res.data
        setTitle(p.title || "")
        setSlug(p.slug || "")
        setExcerpt(p.excerpt || "")
        setSeoTitle(p.seo_title || "")
        setSeoDesc(p.seo_description || "")
        setStatus(p.status || "draft")
        setIsPremium(!!p.is_premium)
        setScheduledAt(p.scheduled_at ? p.scheduled_at.slice(0,16) : "")
        setContent(typeof p.content === "string" ? JSON.parse(p.content) : (p.content ?? null))
        setExistingFeatured(p.featured_image || "")
        setExistingGallery(
          Array.isArray(p.galary) ? p.galary.filter((g: any) => g?.id && g?.image_url) : []
        )
        setSelectedCategories((p.categories ?? []).map((c: any) => Number(c.id)))
        setSelectedTags((p.tags ?? []).map((t: any) => t.name))
      })
      .catch(() => setLoadError("Failed to load post. Please go back and try again."))
      .finally(() => setPageLoading(false))
  }, [postId])

  /* ── slug — NOT auto on edit by default ── */
  useEffect(() => {
    if (!slugLocked && title) setSlug(slugify(title))
  }, [title, slugLocked])

  /* ── featured handlers ── */
  function handleNewFeatured(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setNewFeaturedFile(f); setNewFeaturedPreview(URL.createObjectURL(f))
    setRemoveFeaturedFlag(false); e.target.value = ""
  }
  function removeShownFeatured() {
    if (newFeaturedPreview) { setNewFeaturedFile(null); setNewFeaturedPreview("") }
    else { setRemoveFeaturedFlag(true) }
  }

  /* ── gallery handlers ── */
  function addNewGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []); e.target.value = ""
    setNewGallery(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
  }
  function removeNewGallery(idx: number) { setNewGallery(prev => prev.filter((_,i) => i !== idx)) }
  function removeExistingGallery(id: number) { setRemovedGalleryIds(prev => [...prev, id]) }

  /* ── submit ── */
  const submit = useCallback(async (overrideStatus?: Status) => {
    if (!title.trim()) { setErrorMsg("Title is required."); setSaveState("error"); return }
    setErrorMsg(""); setSaving(true); setSaveState("idle")
    const finalStatus = overrideStatus ?? status
    try {
      const fd = new FormData()
      fd.append("title",           title.trim())
      fd.append("slug",            slug || slugify(title))
      fd.append("excerpt",         excerpt)
      fd.append("content",         JSON.stringify(content))
      fd.append("seo_title",       seoTitle)
      fd.append("seo_description", seoDesc)
      fd.append("status",          finalStatus)
      fd.append("is_premium",      String(isPremium))
      fd.append("reading_time",    String(rt))
      if (scheduledAt)        fd.append("scheduled_at",         scheduledAt)
      if (removeFeaturedFlag) fd.append("remove_featured_image","true")
      if (newFeaturedFile)    fd.append("featured_image",        newFeaturedFile)
      newGallery.forEach(g         => fd.append("gallery_images",     g.file))
      removedGalleryIds.forEach(id => fd.append("remove_gallery_ids[]", String(id)))
      selectedCategories.forEach(id   => fd.append("category_ids[]", String(id)))
      selectedTags.forEach(name        => fd.append("tag_names[]", name))

      await api.patch(`/posts/${postId}`, fd, { headers: { "Content-Type": "multipart/form-data" } })
      setSaveState("saved")
      setRemoveFeaturedFlag(false)
      setRemovedGalleryIds([])
      if (newFeaturedFile) {
        setExistingFeatured(newFeaturedPreview)
        setNewFeaturedFile(null)
        setNewFeaturedPreview("")
      }
      setNewGallery([])
      router.push("/admin/posts")
      setTimeout(() => setSaveState("idle"), 2500)

    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Something went wrong. Please try again.")
      setSaveState("error")
    } finally { setSaving(false) }
  }, [title, slug, excerpt, content, seoTitle, seoDesc, status, isPremium, rt, scheduledAt,
      removeFeaturedFlag, newFeaturedFile, newFeaturedPreview, newGallery, removedGalleryIds,
      selectedCategories, selectedTags, postId])

  /* ── ⌘S shortcut ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); submit() }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [submit])

  /* ── loading / error screens ── */
  if (pageLoading) return (
    <div className="cp cp-loading-screen">
      <div className="cp-loading-inner">
        <div className="cp-loading-spinner"/>
        <p>Loading post…</p>
      </div>
      <style>{cpStyles}</style>
    </div>
  )

  if (loadError) return (
    <div className="cp cp-loading-screen">
      <div className="cp-loading-inner">
        <div className="cp-load-err-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p style={{ color:"var(--red)", marginBottom:16 }}>{loadError}</p>
        <Link href="/admin/posts" className="cp-back" style={{ fontSize:14 }}>← Back to posts</Link>
      </div>
      <style>{cpStyles}</style>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="cp">

      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <header className="cp-bar">
        <div className="cp-bar-l">
          <Link href="/admin/posts" className="cp-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Posts
          </Link>
          <span className="cp-sep"/>
          <span className="cp-crumb" title={title}>
            {title ? (title.length > 40 ? title.slice(0,40)+"…" : title) : `Post #${postId}`}
          </span>
        </div>

        <nav className="cp-nav">
          {(["write","media","seo","settings"] as Tab[]).map(t => (
            <button
              key={t}
              className={`cp-nav-btn ${tab===t ? "cp-nav-btn--on" : ""}`}
              onClick={() => setTab(t)}
            >
              {tabIcon(t)}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t==="media"    && mediaBadge    > 0 && <span className="cp-badge">{mediaBadge}</span>}
              {t==="settings" && taxonomyBadge > 0 && <span className="cp-badge">{taxonomyBadge}</span>}
            </button>
          ))}
        </nav>

        <div className="cp-bar-r">
          <span className="cp-meta-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {rt}min · {wc.toLocaleString()}w
          </span>
          <span className={`cp-status-pill ${status==="published" ? "cp-status-pill--live" : "cp-status-pill--draft"}`}>
            <span className="cp-dot"/>
            {status==="published" ? "Live" : "Draft"}
          </span>
          {isPremium && (
            <span className="cp-status-pill cp-status-pill--premium">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Premium
            </span>
          )}
          <button className="cp-draft-btn" onClick={() => submit("draft")} disabled={saving}>
            Save draft
          </button>
          <button className="cp-publish-btn" onClick={() => submit(status==="published" ? "published" : "published")} disabled={saving}>
            {saving
              ? <><span className="cp-spin"/>Saving…</>
              : saveState==="saved"
              ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Saved!</>
              : <>{status==="published" ? "Update" : "Publish"} <span className="cp-kbd">⌘S</span></>
            }
          </button>
        </div>
      </header>

      {/* ── Error banner ── */}
      {saveState==="error" && errorMsg && (
        <div className="cp-err-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errorMsg}
          <button onClick={() => { setSaveState("idle"); setErrorMsg("") }} className="cp-err-x">×</button>
        </div>
      )}

      <main className="cp-main">

        {/* ══ WRITE ════════════════════════════════════════════════════ */}
        {tab==="write" && (
          <div className="cp-write">
            <div className="cp-title-area">
              <textarea
                className="cp-title-inp"
                placeholder="Post title…"
                value={title}
                rows={1}
                onChange={e => setTitle(e.target.value)}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = "auto"
                  el.style.height = el.scrollHeight + "px"
                }}
              />
              <div className="cp-slug-row">
                <span className="cp-slug-base">yoursite.com/blog/</span>
                <input
                  className="cp-slug-inp"
                  value={slug}
                  placeholder="post-slug"
                  onChange={e => { setSlug(e.target.value); setSlugLocked(true) }}
                />
                <button className="cp-slug-auto" onClick={() => { setSlugLocked(false); setSlug(slugify(title)) }}>
                  ↺ auto
                </button>
              </div>
            </div>

            <div className="cp-editor-wrap">
              <PostEditor content={content} onChange={setContent}/>
            </div>

            <div className="cp-field">
              <label className="cp-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="15" y1="18" x2="3" y2="18"/>
                </svg>
                Excerpt
                <span className="cp-label-sub">Shown in listings and link previews</span>
              </label>
              <textarea
                className="cp-ta"
                placeholder="A short compelling summary of this post…"
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                rows={3}
              />
              <span className="cp-charcount" style={{ color: excerpt.length > 300 ? "#f87171" : "" }}>
                {excerpt.length}/300
              </span>
            </div>
          </div>
        )}

        {/* ══ MEDIA ════════════════════════════════════════════════════ */}
        {tab==="media" && (
          <div className="cp-panel">
            <div className="cp-panel-hd">
              <h2 className="cp-panel-title">Media</h2>
              <p className="cp-panel-sub">Manage the featured image and gallery. New uploads are saved when you click Save/Update.</p>
            </div>

            {/* featured image */}
            <div className="cp-section">
              <div className="cp-section-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                Featured image
                {newFeaturedFile && <span className="cp-new-badge">New upload</span>}
              </div>
              {shownFeatured ? (
                <div className="cp-featured">
                  <img src={shownFeatured} alt="" className="cp-featured-img"/>
                  <div className="cp-featured-overlay">
                    <label className="cp-overlay-btn">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Replace
                      <input type="file" accept="image/*" hidden onChange={handleNewFeatured}/>
                    </label>
                    <button className="cp-overlay-btn cp-overlay-btn--danger" onClick={removeShownFeatured}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      </svg>
                      Remove
                    </button>
                  </div>
                  {newFeaturedFile && (
                    <div className="cp-featured-meta">{newFeaturedFile.name} · {fmtBytes(newFeaturedFile.size)}</div>
                  )}
                </div>
              ) : (
                <label className="cp-dropzone cp-dropzone--lg">
                  <div className="cp-dropzone-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <div className="cp-dropzone-title">
                    {removeFeaturedFlag ? "Featured image removed — upload a new one" : "Drop featured image or click to browse"}
                  </div>
                  <div className="cp-dropzone-sub">PNG, JPG, WebP · max 10 MB</div>
                  <input type="file" accept="image/*" hidden onChange={handleNewFeatured}/>
                </label>
              )}
              {removeFeaturedFlag && !newFeaturedPreview && (
                <button className="cp-text-btn" style={{ marginTop:8 }} onClick={() => setRemoveFeaturedFlag(false)}>
                  Undo remove
                </button>
              )}
            </div>

            {/* gallery */}
            <div className="cp-section">
              <div className="cp-section-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="2"/>
                  <line x1="7" y1="2" x2="7" y2="22"/><line x1="2" y1="7" x2="22" y2="7"/>
                  <line x1="2" y1="17" x2="22" y2="17"/><line x1="17" y1="2" x2="17" y2="22"/>
                </svg>
                Gallery
                {(existingShown.length + newGallery.length) > 0 && (
                  <span className="cp-count-badge">{existingShown.length + newGallery.length}</span>
                )}
                {newGallery.length > 0 && (
                  <span className="cp-new-badge">{newGallery.length} pending upload</span>
                )}
              </div>
              <div className="cp-gallery">
                {/* existing (not removed) */}
                {existingShown.map(g => (
                  <div key={g.id} className="cp-gallery-item cp-gallery-item--existing">
                    <img src={g.image_url} alt="" className="cp-gallery-img"/>
                    <button className="cp-gallery-rm" onClick={() => removeExistingGallery(g.id)}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                    <span className="cp-gallery-badge cp-gallery-badge--saved">saved</span>
                  </div>
                ))}
                {/* new pending */}
                {newGallery.map((g,i) => (
                  <div key={`new-${i}`} className="cp-gallery-item">
                    <img src={g.preview} alt="" className="cp-gallery-img"/>
                    <button className="cp-gallery-rm" onClick={() => removeNewGallery(i)}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                    <span className="cp-gallery-name">{g.file.name.replace(/\.[^/.]+$/,"")}</span>
                    <span className="cp-gallery-badge cp-gallery-badge--new">new</span>
                  </div>
                ))}
                {/* removed existing (show ghost) */}
                {removedGalleryIds.map(id => {
                  const g = existingGallery.find(g => g.id === id)
                  if (!g) return null
                  return (
                    <div key={`rm-${id}`} className="cp-gallery-item cp-gallery-item--removed">
                      <img src={g.image_url} alt="" className="cp-gallery-img cp-gallery-img--faded"/>
                      <button
                        className="cp-gallery-undo"
                        onClick={() => setRemovedGalleryIds(prev => prev.filter(x => x !== id))}
                      >
                        Undo
                      </button>
                    </div>
                  )
                })}
                <label className="cp-gallery-add">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span>{existingShown.length+newGallery.length===0 ? "Add images" : "More"}</span>
                  <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={addNewGallery}/>
                </label>
              </div>
              {removedGalleryIds.length > 0 && (
                <p className="cp-section-note" style={{ color:"#f87171" }}>
                  {removedGalleryIds.length} image{removedGalleryIds.length!==1 ? "s" : ""} will be deleted on save
                </p>
              )}
            </div>

            {/* payload preview */}
            <div className="cp-section">
              <div className="cp-section-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
                PATCH payload
              </div>
              <div className="cp-payload">
                {([
                  ["title",                 title||null,                                                         "—"],
                  ["slug",                  slug||null,                                                          "—"],
                  ["status",                status,                                                              null],
                  ["is_premium",            String(isPremium),                                                   null],
                  ["reading_time",          `${rt} min`,                                                         null],
                  ["scheduled_at",          scheduledAt||null,                                                   "none"],
                  ["remove_featured_image", removeFeaturedFlag?"true":null,                                      "—"],
                  ["featured_image",        newFeaturedFile?newFeaturedFile.name:null,                           "unchanged"],
                  ["gallery_images[]",      newGallery.length>0?`${newGallery.length} new file(s)`:null,        "none"],
                  ["remove_gallery_ids[]",  removedGalleryIds.length>0?removedGalleryIds.join(", "):null,       "none"],
                  ["category_ids[]",        selectedCategories.length>0?selectedCategories.join(", "):null,     "none"],
                  ["tag_names[]",           selectedTags.length>0?selectedTags.map(t=>`#${t}`).join(", "):null, "none"],
                ] as [string,string|null,string|null][]).map(([k,v,empty]) => (
                  <div key={k} className="cp-payload-row">
                    <span className="cp-pk">{k}</span>
                    <span className="cp-pv">{v ?? <em>{empty}</em>}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ SEO ══════════════════════════════════════════════════════ */}
        {tab==="seo" && (
          <div className="cp-panel">
            <div className="cp-panel-hd">
              <h2 className="cp-panel-title">SEO & Discovery</h2>
              <p className="cp-panel-sub">Optimise how this post appears in search engines and social sharing previews.</p>
            </div>
            <div className="cp-seo-grid">
              <div className="cp-seo-left">
                <div className="cp-field">
                  <label className="cp-label">
                    SEO Title
                    <span className={`cp-charcount ${seoTitle.length>60 ? "cp-charcount--over" : ""}`}>
                      {seoTitle.length}/60
                    </span>
                  </label>
                  <input
                    className="cp-inp"
                    placeholder="Leave blank to use post title"
                    value={seoTitle}
                    onChange={e => setSeoTitle(e.target.value)}
                  />
                  <div className="cp-prog">
                    <div className="cp-prog-bar" style={{
                      width: `${Math.min(100,(seoTitle||title).length/60*100)}%`,
                      background: (seoTitle||title).length>60 ? "#f87171" : (seoTitle||title).length>40 ? "#34d399" : "#a5b4fc"
                    }}/>
                  </div>
                </div>
                <div className="cp-field" style={{ marginTop:20 }}>
                  <label className="cp-label">
                    Meta Description
                    <span className={`cp-charcount ${seoDesc.length>160 ? "cp-charcount--over" : ""}`}>
                      {seoDesc.length}/160
                    </span>
                  </label>
                  <textarea
                    className="cp-ta"
                    placeholder="Leave blank to use excerpt"
                    value={seoDesc}
                    onChange={e => setSeoDesc(e.target.value)}
                    rows={4}
                  />
                  <div className="cp-prog">
                    <div className="cp-prog-bar" style={{
                      width: `${Math.min(100,(seoDesc||excerpt).length/160*100)}%`,
                      background: (seoDesc||excerpt).length>160 ? "#f87171" : (seoDesc||excerpt).length>80 ? "#34d399" : "#a5b4fc"
                    }}/>
                  </div>
                </div>
                <div className="cp-chips">
                  {[
                    { ok: title.length>=30,                                                          label:"Title length"     },
                    { ok: (seoTitle||title).length<=60,                                              label:"SEO title ≤60"    },
                    { ok: (seoDesc||excerpt).length>=50&&(seoDesc||excerpt).length<=160,             label:"Meta desc length" },
                    { ok: slug.length>0,                                                             label:"URL slug"         },
                    { ok: !!shownFeatured,                                                           label:"Featured image"   },
                    { ok: wc>=300,                                                                   label:"Word count ≥300"  },
                    { ok: selectedCategories.length>0,                                               label:"Categories"       },
                    { ok: selectedTags.length>0,                                                     label:"Tags"             },
                  ].map(c => (
                    <span key={c.label} className={`cp-chip ${c.ok ? "cp-chip--ok" : "cp-chip--warn"}`}>
                      {c.ok ? "✓" : "!"} {c.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* SERP preview */}
              <div className="cp-seo-right">
                <div className="cp-serp-label">Google preview</div>
                <div className="cp-serp">
                  <div className="cp-serp-row">
                    <div className="cp-serp-fav"/>
                    <div>
                      <div className="cp-serp-site">Your Blog</div>
                      <div className="cp-serp-url">yoursite.com › blog › {slug||"post-slug"}</div>
                    </div>
                    <span className="cp-serp-more">⋮</span>
                  </div>
                  <div className="cp-serp-title">{seoTitleFinal||"Your post title will appear here"}</div>
                  <div className="cp-serp-desc">{seoDescFinal||"Your meta description will appear here. Write something that makes people want to click through."}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ SETTINGS ═════════════════════════════════════════════════ */}
        {tab==="settings" && (
          <div className="cp-panel">
            <div className="cp-panel-hd">
              <h2 className="cp-panel-title">Post Settings</h2>
              <p className="cp-panel-sub">Control visibility, categories, tags and scheduling.</p>
            </div>

            <div className="cp-settings-grid">

              {/* Status */}
              <div className="cp-card">
                <div className="cp-card-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Publish status
                </div>
                <div className="cp-radios">
                  {(["draft","published"] as Status[]).map(s => (
                    <label key={s} className={`cp-radio ${status===s ? "cp-radio--on" : ""}`}>
                      <input type="radio" name="status" value={s} checked={status===s} onChange={() => setStatus(s)} hidden/>
                      <span className={`cp-radio-dot ${s==="published" ? "cp-radio-dot--green" : ""} ${status===s ? "cp-radio-dot--active" : ""}`}/>
                      <span>
                        <span className="cp-radio-name">{s==="draft" ? "Draft" : "Published"}</span>
                        <span className="cp-radio-hint">{s==="draft" ? "Only visible to you" : "Live for all readers"}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Premium */}
              <div className="cp-card">
                <div className="cp-card-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Premium access
                </div>
                <div className="cp-toggle-row" onClick={() => setIsPremium(p => !p)}>
                  <span>
                    <div className="cp-toggle-name">Mark as premium</div>
                    <div className="cp-toggle-hint">Requires a paid subscription to read</div>
                  </span>
                  <div className={`cp-toggle ${isPremium ? "cp-toggle--on" : ""}`}>
                    <div className="cp-toggle-knob"/>
                  </div>
                </div>
                {isPremium && (
                  <div className="cp-premium-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    Paywalled — subscribers only
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div className="cp-card">
                <div className="cp-card-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Schedule
                </div>
                <p className="cp-card-hint">Set a publish date/time or leave empty.</p>
                <input
                  type="datetime-local"
                  className="cp-inp cp-inp--dt"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                />
                {scheduledAt && (
                  <button className="cp-text-btn" onClick={() => setScheduledAt("")}>Clear schedule</button>
                )}
              </div>

              {/* Overview */}
              <div className="cp-card">
                <div className="cp-card-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                  Overview
                </div>
                <div className="cp-overview">
                  {[
                    { n: rt,                                     l: "min read"   },
                    { n: wc.toLocaleString(),                    l: "words"      },
                    { n: existingShown.length+newGallery.length, l: "gallery"    },
                    { n: selectedCategories.length,              l: "categories" },
                    { n: selectedTags.length,                    l: "tags"       },
                  ].map((s,i) => (
                    <div key={i} className="cp-overview-stat">
                      <div className="cp-overview-n">{s.n}</div>
                      <div className="cp-overview-l">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories — full width */}
              <div className="cp-card cp-card--full">
                <div className="cp-card-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                  Categories
                  {selectedCategories.length > 0 && (
                    <span className="cp-badge" style={{ marginLeft:"auto" }}>{selectedCategories.length}</span>
                  )}
                </div>
                <CategoryPicker selected={selectedCategories} onChange={setSelectedCategories}/>
              </div>

              {/* Tags — full width */}
              <div className="cp-card cp-card--full">
                <div className="cp-card-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                  Tags
                  {selectedTags.length > 0 && (
                    <span className="cp-badge" style={{ marginLeft:"auto" }}>{selectedTags.length}</span>
                  )}
                </div>
                <TagInput value={selectedTags} onChange={setSelectedTags}/>
              </div>

              {/* SEO Keywords — full width, INSIDE the grid */}
              <div className="cp-card cp-card--full">
                <SeoKeywords postId={postId}/>
              </div>

            </div>{/* end cp-settings-grid */}

            <div className="cp-save-row">
              <button className="cp-save-draft" onClick={() => submit("draft")} disabled={saving}>
                Save as draft
              </button>
              <button
                className="cp-save-publish"
                onClick={() => submit(status==="published" ? "published" : "published")}
                disabled={saving}
              >
                {saving ? "Saving…" : saveState==="saved" ? "✓ Saved!" : status==="published" ? "Update post" : "Publish post"}
              </button>
            </div>
          </div>
        )}

      </main>

      <style>{cpStyles}</style>
    </div>
  )
}

/* ── tab icons ──────────────────────────────────────────────────────────── */
function tabIcon(t: Tab) {
  const s = {
    width:12, height:12, viewBox:"0 0 24 24", fill:"none",
    stroke:"currentColor", strokeWidth:"2.2",
    strokeLinecap:"round" as const, strokeLinejoin:"round" as const
  }
  if (t==="write")    return <svg {...s}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  if (t==="media")    return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  if (t==="seo")      return <svg {...s}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  if (t==="settings") return <svg {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  return null
}

/* ── styles ─────────────────────────────────────────────────────────────── */
const cpStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --bg:#09090e;--s0:#0f0f17;--s1:#141420;--s2:#1a1a28;
    --b0:rgba(255,255,255,0.06);--b1:rgba(255,255,255,0.11);
    --t0:rgba(255,255,255,0.92);--t1:rgba(255,255,255,0.55);--t2:rgba(255,255,255,0.28);--t3:rgba(255,255,255,0.12);
    --acc:#6366f1;--acc-l:#a5b4fc;--acc-a:rgba(99,102,241,0.15);--acc-b:rgba(99,102,241,0.28);
    --grn:#34d399;--grn-a:rgba(52,211,153,0.12);
    --amb:#fbbf24;--amb-a:rgba(251,191,36,0.12);
    --red:#f87171;--red-a:rgba(248,113,113,0.12);
    --font:'DM Sans',-apple-system,sans-serif;
    --r:10px;--t:0.16s cubic-bezier(0.4,0,0.2,1);
  }
  .cp{font-family:var(--font);background:var(--bg);color:var(--t0);min-height:100vh;display:flex;flex-direction:column;animation:fadein .3s ease both;}
  @keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .cp-loading-screen{align-items:center;justify-content:center;}
  .cp-loading-inner{display:flex;flex-direction:column;align-items:center;gap:14px;color:var(--t1);font-size:14px;}
  .cp-loading-spinner{width:32px;height:32px;border:2.5px solid rgba(255,255,255,0.08);border-top-color:var(--acc-l);border-radius:50%;animation:spin .7s linear infinite;}
  .cp-load-err-icon{color:var(--red);margin-bottom:4px;}
  .cp-bar{display:flex;align-items:center;gap:14px;height:54px;padding:0 20px;border-bottom:1px solid var(--b0);background:rgba(9,9,14,.9);backdrop-filter:blur(20px);position:sticky;top:0;z-index:300;flex-shrink:0;}
  .cp-bar-l{display:flex;align-items:center;gap:8px;flex:1;min-width:0;}
  .cp-bar-r{display:flex;align-items:center;gap:8px;flex-shrink:0;}
  .cp-back{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:var(--t1);text-decoration:none;white-space:nowrap;transition:color var(--t);}
  .cp-back:hover{color:var(--t0);}
  .cp-sep{width:1px;height:13px;background:var(--b1);flex-shrink:0;}
  .cp-crumb{font-size:12.5px;font-weight:500;color:var(--t0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;}
  .cp-nav{display:flex;background:var(--s1);border:1px solid var(--b0);border-radius:8px;padding:3px;gap:1px;}
  .cp-nav-btn{display:inline-flex;align-items:center;gap:5px;font-family:var(--font);font-size:12px;font-weight:500;color:var(--t1);background:transparent;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;transition:background var(--t),color var(--t);white-space:nowrap;}
  .cp-nav-btn:hover{color:var(--t0);background:rgba(255,255,255,0.04);}
  .cp-nav-btn--on{background:var(--s0);color:var(--t0);box-shadow:inset 0 0 0 1px var(--b0);}
  .cp-badge{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;border-radius:8px;background:var(--acc-a);color:var(--acc-l);font-size:10px;font-weight:600;padding:0 4px;}
  .cp-meta-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500;padding:4px 10px;border-radius:20px;background:rgba(255,255,255,0.05);color:var(--t1);white-space:nowrap;}
  .cp-status-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500;padding:4px 10px;border-radius:20px;white-space:nowrap;}
  .cp-status-pill--draft{background:rgba(255,255,255,0.05);color:var(--t2);}
  .cp-status-pill--live{background:var(--grn-a);color:var(--grn);}
  .cp-status-pill--premium{background:var(--amb-a);color:var(--amb);}
  .cp-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;}
  .cp-status-pill--live .cp-dot{animation:pulse 2s ease infinite;}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  .cp-draft-btn{display:inline-flex;align-items:center;gap:6px;font-family:var(--font);font-size:12.5px;font-weight:500;color:var(--t1);background:rgba(255,255,255,0.07);border:1px solid var(--b0);border-radius:8px;padding:7px 14px;cursor:pointer;white-space:nowrap;transition:background var(--t),color var(--t);}
  .cp-draft-btn:hover:not(:disabled){background:rgba(255,255,255,0.11);color:var(--t0);}
  .cp-draft-btn:disabled{opacity:.5;cursor:not-allowed;}
  .cp-publish-btn{display:inline-flex;align-items:center;gap:6px;font-family:var(--font);font-size:13px;font-weight:600;color:#fff;background:var(--acc);border:none;border-radius:8px;padding:7px 18px;cursor:pointer;white-space:nowrap;box-shadow:0 4px 16px rgba(99,102,241,0.35);transition:background var(--t),transform var(--t);}
  .cp-publish-btn:hover:not(:disabled){background:#4f52e8;transform:translateY(-1px);}
  .cp-publish-btn:disabled{opacity:.6;cursor:not-allowed;}
  .cp-kbd{font-size:10px;font-weight:400;background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:3px;}
  .cp-spin{width:12px;height:12px;border:2px solid rgba(255,255,255,0.25);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;flex-shrink:0;}
  .cp-err-banner{display:flex;align-items:center;gap:10px;padding:10px 20px;background:var(--red-a);border-bottom:1px solid rgba(248,113,113,0.2);color:#fca5a5;font-size:13.5px;}
  .cp-err-x{margin-left:auto;background:none;border:none;color:#fca5a5;font-size:20px;cursor:pointer;line-height:1;padding:0;}
  .cp-main{flex:1;overflow-y:auto;}
  .cp-write{max-width:780px;margin:0 auto;padding:48px 28px 100px;}
  .cp-title-area{margin-bottom:24px;}
  .cp-title-inp{width:100%;background:transparent;border:none;outline:none;resize:none;overflow:hidden;font-family:'Syne',sans-serif;font-size:clamp(30px,5vw,50px);font-weight:800;line-height:1.15;color:var(--t0);letter-spacing:-0.03em;caret-color:var(--acc-l);}
  .cp-title-inp::placeholder{color:var(--t3);}
  .cp-slug-row{display:flex;align-items:center;gap:0;margin-top:12px;padding:6px 12px;background:var(--s1);border:1px solid var(--b0);border-radius:7px;font-size:12px;}
  .cp-slug-base{color:var(--t2);flex-shrink:0;white-space:nowrap;}
  .cp-slug-inp{flex:1;background:transparent;border:none;outline:none;font-size:12px;font-family:var(--font);color:var(--acc-l);min-width:0;}
  .cp-slug-auto{font-size:11px;color:var(--t2);background:rgba(255,255,255,0.06);border:1px solid var(--b0);border-radius:4px;padding:2px 7px;cursor:pointer;font-family:var(--font);flex-shrink:0;margin-left:8px;transition:color var(--t);}
  .cp-slug-auto:hover{color:var(--t0);}
  .cp-editor-wrap{background:var(--s0);border:1px solid var(--b0);border-radius:12px;overflow:hidden;margin-bottom:28px;}
  .cp-editor-wrap:focus-within{border-color:var(--acc-b);box-shadow:0 0 0 3px var(--acc-a);}
  .cp-field{display:flex;flex-direction:column;gap:8px;margin-bottom:4px;}
  .cp-label{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--t1);}
  .cp-label-sub{margin-left:auto;font-weight:400;font-size:11px;text-transform:none;letter-spacing:0;color:var(--t2);}
  .cp-ta{width:100%;background:var(--s1);border:1px solid var(--b0);border-radius:8px;color:var(--t0);font-family:var(--font);font-size:14px;padding:10px 14px;outline:none;resize:vertical;min-height:80px;line-height:1.65;transition:border-color var(--t),box-shadow var(--t);}
  .cp-ta:focus{border-color:var(--acc-b);box-shadow:0 0 0 3px var(--acc-a);}
  .cp-ta::placeholder{color:var(--t3);}
  .cp-inp{width:100%;background:var(--s1);border:1px solid var(--b0);border-radius:8px;color:var(--t0);font-family:var(--font);font-size:14px;padding:10px 14px;outline:none;transition:border-color var(--t),box-shadow var(--t);}
  .cp-inp:focus{border-color:var(--acc-b);box-shadow:0 0 0 3px var(--acc-a);}
  .cp-inp::placeholder{color:var(--t3);}
  .cp-inp--dt{color-scheme:dark;font-size:13px;}
  .cp-charcount{font-size:11px;color:var(--t2);text-align:right;margin-top:-4px;}
  .cp-charcount--over{color:var(--red);}
  .cp-panel{max-width:900px;margin:0 auto;padding:44px 28px 100px;}
  .cp-panel-hd{margin-bottom:36px;padding-bottom:24px;border-bottom:1px solid var(--b0);}
  .cp-panel-title{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(24px,4vw,34px);color:var(--t0);letter-spacing:-0.025em;margin-bottom:6px;}
  .cp-panel-sub{font-size:14px;color:var(--t1);line-height:1.6;}
  .cp-section{margin-bottom:40px;}
  .cp-section-label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--t1);margin-bottom:14px;}
  .cp-section-note{font-size:12px;color:var(--t2);margin-top:12px;}
  .cp-count-badge{background:var(--acc-a);color:var(--acc-l);border-radius:10px;font-size:10px;padding:1px 7px;font-weight:700;}
  .cp-new-badge{background:rgba(251,191,36,0.12);color:var(--amb);border-radius:10px;font-size:10px;padding:1px 7px;font-weight:600;}
  .cp-dropzone{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1.5px dashed rgba(255,255,255,0.09);border-radius:12px;cursor:pointer;transition:background var(--t),border-color var(--t);}
  .cp-dropzone--lg{height:220px;}
  .cp-dropzone:hover{background:rgba(255,255,255,0.02);border-color:var(--acc-b);}
  .cp-dropzone-icon{color:var(--t2);margin-bottom:4px;}
  .cp-dropzone-title{font-size:15px;font-weight:500;color:var(--t1);}
  .cp-dropzone-sub{font-size:12.5px;color:var(--t2);}
  .cp-featured{position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--b0);}
  .cp-featured-img{width:100%;height:260px;object-fit:cover;display:block;}
  .cp-featured-overlay{position:absolute;top:10px;right:10px;display:flex;gap:8px;}
  .cp-overlay-btn{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-family:var(--font);font-weight:500;padding:7px 13px;border-radius:8px;cursor:pointer;border:none;background:rgba(0,0,0,0.55);color:#fff;backdrop-filter:blur(8px);transition:background var(--t);}
  .cp-overlay-btn:hover{background:rgba(0,0,0,0.72);}
  .cp-overlay-btn--danger{color:#fca5a5;}
  .cp-overlay-btn--danger:hover{background:rgba(248,113,113,0.3);}
  .cp-featured-meta{position:absolute;bottom:10px;left:12px;font-size:11px;color:rgba(255,255,255,0.65);background:rgba(0,0,0,0.5);padding:3px 10px;border-radius:20px;backdrop-filter:blur(4px);}
  .cp-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;}
  .cp-gallery-item{position:relative;border-radius:10px;overflow:hidden;border:1px solid var(--b0);aspect-ratio:1;}
  .cp-gallery-item--existing{border-color:rgba(52,211,153,0.15);}
  .cp-gallery-item--removed{opacity:.4;}
  .cp-gallery-img{width:100%;height:100%;object-fit:cover;display:block;}
  .cp-gallery-img--faded{filter:grayscale(1);}
  .cp-gallery-rm{position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,0.72);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity var(--t);}
  .cp-gallery-item:hover .cp-gallery-rm{opacity:1;}
  .cp-gallery-undo{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;background:rgba(0,0,0,0.5);border:none;cursor:pointer;font-family:var(--font);}
  .cp-gallery-name{position:absolute;bottom:0;left:0;right:0;padding:4px 7px;font-size:10px;color:rgba(255,255,255,0.7);background:linear-gradient(transparent,rgba(0,0,0,0.7));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .cp-gallery-badge{position:absolute;top:6px;left:6px;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;}
  .cp-gallery-badge--saved{background:rgba(52,211,153,0.2);color:var(--grn);}
  .cp-gallery-badge--new{background:var(--amb-a);color:var(--amb);}
  .cp-gallery-add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;aspect-ratio:1;border-radius:10px;border:1.5px dashed rgba(255,255,255,0.09);cursor:pointer;color:var(--t2);font-size:12px;transition:background var(--t),border-color var(--t),color var(--t);}
  .cp-gallery-add:hover{background:rgba(255,255,255,0.02);border-color:var(--acc-b);color:var(--acc-l);}
  .cp-payload{background:var(--s1);border:1px solid var(--b0);border-radius:10px;overflow:hidden;}
  .cp-payload-row{display:flex;align-items:baseline;gap:12px;padding:9px 16px;border-bottom:1px solid var(--b0);font-size:13px;}
  .cp-payload-row:last-child{border-bottom:none;}
  .cp-pk{flex-shrink:0;width:180px;font-family:monospace;font-size:11.5px;color:var(--acc-l);}
  .cp-pv{color:var(--t1);word-break:break-all;}
  .cp-pv em{font-style:normal;color:var(--t3);}
  .cp-seo-grid{display:grid;grid-template-columns:1fr 360px;gap:28px;align-items:start;}
  .cp-seo-left{display:flex;flex-direction:column;gap:20px;}
  .cp-prog{height:2px;background:rgba(255,255,255,0.06);border-radius:99px;margin-top:8px;overflow:hidden;}
  .cp-prog-bar{height:100%;border-radius:99px;transition:width .2s,background .2s;}
  .cp-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:4px;}
  .cp-chip{font-size:11.5px;font-weight:500;padding:3px 10px;border-radius:20px;}
  .cp-chip--ok{background:var(--grn-a);color:var(--grn);}
  .cp-chip--warn{background:var(--amb-a);color:var(--amb);}
  .cp-seo-right{position:sticky;top:72px;}
  .cp-serp-label{font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;}
  .cp-serp{background:var(--s1);border:1px solid var(--b0);border-radius:12px;padding:18px 20px;}
  .cp-serp-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
  .cp-serp-fav{width:24px;height:24px;border-radius:50%;background:var(--acc-a);border:1px solid var(--acc-b);flex-shrink:0;}
  .cp-serp-site{font-size:12.5px;color:var(--t0);font-weight:500;}
  .cp-serp-url{font-size:11px;color:var(--t2);word-break:break-all;}
  .cp-serp-more{margin-left:auto;color:var(--t2);font-size:18px;line-height:1;}
  .cp-serp-title{font-size:17px;color:#93bbfc;font-weight:400;line-height:1.3;margin-bottom:5px;}
  .cp-serp-desc{font-size:13px;color:var(--t2);line-height:1.55;}
  .cp-settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;}
  .cp-card{background:var(--s0);border:1px solid var(--b0);border-radius:var(--r);padding:20px 22px;transition:border-color var(--t);}
  .cp-card:focus-within{border-color:var(--acc-b);}
  .cp-card--full{grid-column:span 2;}
  .cp-card-title{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--t1);margin-bottom:16px;}
  .cp-card-hint{font-size:12.5px;color:var(--t2);margin-bottom:12px;line-height:1.6;}
  .cp-radios{display:flex;flex-direction:column;gap:8px;}
  .cp-radio{display:flex;align-items:center;gap:10px;padding:10px 13px;border-radius:8px;border:1px solid var(--b0);cursor:pointer;transition:border-color var(--t),background var(--t);}
  .cp-radio--on{border-color:var(--acc-b);background:var(--acc-a);}
  .cp-radio-dot{width:14px;height:14px;border-radius:50%;border:2px solid var(--b1);flex-shrink:0;transition:border-color var(--t),background var(--t),box-shadow var(--t);}
  .cp-radio-dot--active{border-color:var(--acc-l);background:var(--acc-l);box-shadow:0 0 0 3px var(--acc-a);}
  .cp-radio-dot--green.cp-radio-dot--active{border-color:var(--grn);background:var(--grn);box-shadow:0 0 0 3px var(--grn-a);}
  .cp-radio-name{display:block;font-size:13.5px;font-weight:500;color:var(--t0);}
  .cp-radio-hint{display:block;font-size:11.5px;color:var(--t1);margin-top:2px;}
  .cp-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;}
  .cp-toggle-name{font-size:13.5px;font-weight:500;color:var(--t0);}
  .cp-toggle-hint{font-size:11.5px;color:var(--t1);margin-top:2px;}
  .cp-toggle{flex-shrink:0;width:38px;height:21px;background:rgba(255,255,255,0.08);border:1px solid var(--b1);border-radius:11px;position:relative;transition:background var(--t),border-color var(--t);cursor:pointer;}
  .cp-toggle--on{background:var(--acc);border-color:var(--acc);}
  .cp-toggle-knob{position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;transition:transform var(--t);box-shadow:0 1px 3px rgba(0,0,0,0.3);}
  .cp-toggle--on .cp-toggle-knob{transform:translateX(17px);}
  .cp-premium-badge{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:var(--amb);background:var(--amb-a);border:1px solid rgba(251,191,36,0.2);border-radius:20px;padding:4px 10px;margin-top:12px;}
  .cp-text-btn{display:inline-block;margin-top:8px;font-size:12px;color:var(--t2);background:none;border:none;font-family:var(--font);cursor:pointer;text-decoration:underline;padding:0;transition:color var(--t);}
  .cp-text-btn:hover{color:var(--t1);}
  .cp-overview{display:flex;border:1px solid var(--b0);border-radius:8px;overflow:hidden;}
  .cp-overview-stat{flex:1;text-align:center;padding:10px 6px;border-right:1px solid var(--b0);}
  .cp-overview-stat:last-child{border-right:none;}
  .cp-overview-n{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--t0);letter-spacing:-0.02em;}
  .cp-overview-l{font-size:10.5px;color:var(--t1);margin-top:2px;}
  .cp-save-row{display:flex;gap:12px;}
  .cp-save-draft{flex:1;padding:13px;font-family:var(--font);font-size:14px;font-weight:600;color:var(--t1);background:rgba(255,255,255,0.06);border:1px solid var(--b0);border-radius:var(--r);cursor:pointer;transition:background var(--t),color var(--t);}
  .cp-save-draft:hover:not(:disabled){background:rgba(255,255,255,0.1);color:var(--t0);}
  .cp-save-draft:disabled{opacity:.5;cursor:not-allowed;}
  .cp-save-publish{flex:2;padding:13px;font-family:var(--font);font-size:14px;font-weight:700;color:#fff;background:var(--acc);border:none;border-radius:var(--r);cursor:pointer;letter-spacing:-0.01em;box-shadow:0 4px 20px rgba(99,102,241,0.35);transition:background var(--t),transform var(--t);}
  .cp-save-publish:hover:not(:disabled){background:#4f52e8;transform:translateY(-1px);}
  .cp-save-publish:disabled{opacity:.6;cursor:not-allowed;}
  @media(max-width:860px){.cp-seo-grid{grid-template-columns:1fr;}.cp-seo-right{position:static;}}
  @media(max-width:640px){
    .cp-settings-grid{grid-template-columns:1fr;}
    .cp-card--full{grid-column:1;}
    .cp-write,.cp-panel{padding-left:16px;padding-right:16px;}
    .cp-meta-pill{display:none;}
    .cp-bar{padding:0 12px;gap:8px;}
    .cp-save-row{flex-direction:column;}
  }
`