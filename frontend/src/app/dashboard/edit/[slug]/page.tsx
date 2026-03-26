"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import api from "@/lib/axios"
import PostEditor from "@/components/editor/PostEditor"

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g,"").replace(/[\s_]+/g,"-").replace(/^-+|-+$/g,"")
}
function countWords(json: any): number {
  if (!json) return 0
  try { return JSON.stringify(json).replace(/<[^>]*>/g," ").split(/\s+/).filter(Boolean).length } catch { return 0 }
}
function readingTime(json: any) { return Math.max(1, Math.ceil(countWords(json)/200)) }
function fmtBytes(n: number) { return n<1024*1024?`${(n/1024).toFixed(0)} KB`:`${(n/1024/1024).toFixed(2)} MB` }

type Tab = "write" | "media"
type NewImg = { file: File; preview: string }
type ExistingImg = { id: number; image_url: string }

export default function UserEditPostPage() {
  const router  = useRouter()
  const params  = useParams()
  const postId  = params?.slug as string
console.log(postId,"postId coming")
  const [pageLoading, setPageLoading] = useState(true)
  const [loadError,   setLoadError]   = useState("")
  const [postStatus,  setPostStatus]  = useState<"draft"|"pending"|"published">("draft")

  const [title,      setTitle]      = useState("")
  const [slug,       setSlug]       = useState("")
  const [slugLocked, setSlugLocked] = useState(true)
  const [content,    setContent]    = useState<any>(null)
  const [excerpt,    setExcerpt]    = useState("")
  const [seoTitle,   setSeoTitle]   = useState("")
  const [seoDesc,    setSeoDesc]    = useState("")

  const [existingFeatured,   setExistingFeatured]   = useState("")
  const [removeFeaturedFlag, setRemoveFeaturedFlag] = useState(false)
  const [newFeaturedFile,    setNewFeaturedFile]    = useState<File|null>(null)
  const [newFeaturedPreview, setNewFeaturedPreview] = useState("")
  const [existingGallery,    setExistingGallery]    = useState<ExistingImg[]>([])
  const [removedGalleryIds,  setRemovedGalleryIds]  = useState<number[]>([])
  const [newGallery,         setNewGallery]         = useState<NewImg[]>([])
  const galleryRef = useRef<HTMLInputElement>(null)

  const [tab,       setTab]       = useState<Tab>("write")
  const [saving,    setSaving]    = useState(false)
  const [saveState, setSaveState] = useState<"idle"|"saved"|"submitted"|"error">("idle")
  const [errorMsg,  setErrorMsg]  = useState("")

  const rt = readingTime(content)
  const wc = countWords(content)
  const shownFeatured = newFeaturedPreview || (removeFeaturedFlag ? "" : existingFeatured)
  const existingShown = existingGallery.filter(g => !removedGalleryIds.includes(g.id))

  /* ── load ── */
  useEffect(() => {
    if (!postId) return
    setPageLoading(true)
    api.get(`/posts/id/${postId}`)
      .then(res => {
        const p = res.data?.data ?? res.data
        setPostStatus(p.status)
        setTitle(p.title || "")
        setSlug(p.slug || "")
        setExcerpt(p.excerpt || "")
        setSeoTitle(p.seo_title || "")
        setSeoDesc(p.seo_description || "")
        setContent(typeof p.content === "string" ? JSON.parse(p.content) : (p.content ?? null))
        setExistingFeatured(p.featured_image || "")
        setExistingGallery(Array.isArray(p.galary) ? p.galary.filter((g:any) => g?.id && g?.image_url) : [])
      })
      .catch(() => setLoadError("Failed to load post."))
      .finally(() => setPageLoading(false))
  }, [postId])

  useEffect(() => {
    if (!slugLocked && title) setSlug(slugify(title))
  }, [title, slugLocked])

  /* ── featured ── */
  function handleNewFeatured(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setNewFeaturedFile(f); setNewFeaturedPreview(URL.createObjectURL(f))
    setRemoveFeaturedFlag(false); e.target.value = ""
  }
  function removeShownFeatured() {
    if (newFeaturedPreview) { setNewFeaturedFile(null); setNewFeaturedPreview("") }
    else { setRemoveFeaturedFlag(true) }
  }

  /* ── gallery ── */
  function addNewGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []); e.target.value = ""
    setNewGallery(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
  }

  /* ── save draft ── */
  const saveDraft = useCallback(async () => {
    if (!title.trim()) { setErrorMsg("Title is required."); setSaveState("error"); return }
    setErrorMsg(""); setSaving(true); setSaveState("idle")
    try {
      const fd = new FormData()
      fd.append("title",            title.trim())
      fd.append("slug",             slug || slugify(title))
      fd.append("excerpt",          excerpt)
      fd.append("content",          JSON.stringify(content))
      fd.append("seo_title",        seoTitle)
      fd.append("seo_description",  seoDesc)
      fd.append("status",           "draft")
      fd.append("reading_time",     String(rt))
      if (removeFeaturedFlag) fd.append("remove_featured_image","true")
      if (newFeaturedFile)    fd.append("featured_image", newFeaturedFile)
      newGallery.forEach(g          => fd.append("gallery_images",      g.file))
      removedGalleryIds.forEach(id  => fd.append("remove_gallery_ids[]", String(id)))

      await api.patch(`/posts/${postId}`, fd, { headers: { "Content-Type": "multipart/form-data" } })
      setSaveState("saved")
      setPostStatus("draft")
      setRemovedGalleryIds([])
      if (newFeaturedFile) { setExistingFeatured(newFeaturedPreview); setNewFeaturedFile(null); setNewFeaturedPreview("") }
      setNewGallery([])
      setTimeout(() => setSaveState("idle"), 2500)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Save failed.")
      setSaveState("error")
    } finally { setSaving(false) }
  }, [title, slug, excerpt, content, seoTitle, seoDesc, rt, removeFeaturedFlag, newFeaturedFile, newFeaturedPreview, newGallery, removedGalleryIds, postId])

  /* ── submit for review ── */
  const submitForReview = useCallback(async () => {
    if (!title.trim()) { setErrorMsg("Title is required."); setSaveState("error"); return }
    if (wc < 50)       { setErrorMsg("Post is too short. Write at least 50 words."); setSaveState("error"); return }
    setErrorMsg(""); setSaving(true); setSaveState("idle")
    try {
      const fd = new FormData()
      fd.append("title",            title.trim())
      fd.append("slug",             slug || slugify(title))
      fd.append("excerpt",          excerpt)
      fd.append("content",          JSON.stringify(content))
      fd.append("seo_title",        seoTitle)
      fd.append("seo_description",  seoDesc)
      fd.append("status",           "pending")
      fd.append("reading_time",     String(rt))
      if (removeFeaturedFlag) fd.append("remove_featured_image","true")
      if (newFeaturedFile)    fd.append("featured_image", newFeaturedFile)
      newGallery.forEach(g          => fd.append("gallery_images",      g.file))
      removedGalleryIds.forEach(id  => fd.append("remove_gallery_ids[]", String(id)))

      await api.patch(`/posts/${postId}`, fd, { headers: { "Content-Type": "multipart/form-data" } })
      setSaveState("submitted")
      setPostStatus("pending")
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Submission failed.")
      setSaveState("error")
    } finally { setSaving(false) }
  }, [title, slug, excerpt, content, seoTitle, seoDesc, rt, wc, removeFeaturedFlag, newFeaturedFile, newGallery, removedGalleryIds, postId])

  /* ⌘S */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey||e.ctrlKey)&&e.key==="s") { e.preventDefault(); saveDraft() } }
    window.addEventListener("keydown",h); return () => window.removeEventListener("keydown",h)
  }, [saveDraft])

  /* ── loading ── */
  if (pageLoading) return (
    <div className="uep uep-center">
      <div className="uep-spinner"/><p style={{color:"var(--t1)",fontSize:14}}>Loading post…</p>
      <style>{styles}</style>
    </div>
  )

  if (loadError) return (
    <div className="uep uep-center">
      <p style={{color:"var(--red)",marginBottom:16}}>{loadError}</p>
      <Link href="/dashboard/posts" style={{color:"var(--acc-l)",fontSize:14}}>← Back to posts</Link>
      <style>{styles}</style>
    </div>
  )

  /* ── PUBLISHED — read-only ── */
  if (postStatus === "published") return (
    <div className="uep uep-center">
      <div className="uep-locked-card">
        <div className="uep-locked-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 className="uep-locked-title">Post is published</h2>
        <p className="uep-locked-sub">
          This post is live and can no longer be edited.<br/>
          Contact an admin if you need to make changes.
        </p>
        <Link href={`/blog/${slug}`} className="uep-btn uep-btn--primary" target="_blank">
          View post →
        </Link>
        <Link href="/dashboard/posts" className="uep-btn uep-btn--ghost">Back to my posts</Link>
      </div>
      <style>{styles}</style>
    </div>
  )

  /* ── submitted success ── */
  if (saveState === "submitted") return (
    <div className="uep uep-center">
      <div className="uep-locked-card">
        <div className="uep-success-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h2 className="uep-locked-title">Submitted for review!</h2>
        <p className="uep-locked-sub">Your changes have been submitted. An editor will review and publish them soon.</p>
        <Link href="/dashboard/posts" className="uep-btn uep-btn--primary">Back to my posts</Link>
      </div>
      <style>{styles}</style>
    </div>
  )

  return (
    <div className="uep">

      {/* ── Topbar ── */}
      <header className="uep-bar">
        <div className="uep-bar-l">
          <Link href="/dashboard/posts" className="uep-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            My posts
          </Link>
          <span className="uep-sep"/>
          <span className="uep-crumb">{title?(title.length>40?title.slice(0,40)+"…":title):`Post #${postId}`}</span>
        </div>

        <nav className="uep-nav">
          {(["write","media"] as Tab[]).map(t => (
            <button key={t} className={`uep-nav-btn ${tab===t?"uep-nav-btn--on":""}`} onClick={() => setTab(t)}>
              {t==="write"
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              }
              {t.charAt(0).toUpperCase()+t.slice(1)}
              {t==="media" && (existingShown.length+newGallery.length+(shownFeatured?1:0))>0 && (
                <span className="uep-badge">{existingShown.length+newGallery.length+(shownFeatured?1:0)}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="uep-bar-r">
          <span className="uep-pill">
            {rt}m · {wc}w
          </span>
          {/* status badge */}
          <span className={`uep-status ${postStatus==="pending"?"uep-status--pending":"uep-status--draft"}`}>
            <span className="uep-status-dot"/>
            {postStatus==="pending" ? "Under review" : "Draft"}
          </span>
          <button className="uep-draft-btn" onClick={saveDraft} disabled={saving || postStatus==="pending"} title={postStatus==="pending"?"Withdraw from review to edit":"Save draft"}>
            {saving && saveState==="idle" ? <><span className="uep-spin"/>Saving…</>
              : saveState==="saved" ? <>✓ Saved</>
              : "Save draft"
            }
          </button>
          {postStatus === "pending" ? (
            <button className="uep-withdraw-btn" onClick={saveDraft} disabled={saving} title="Pull back from review to keep editing">
              Withdraw & edit
            </button>
          ) : (
            <button className="uep-submit-btn" onClick={submitForReview} disabled={saving}>
              {saving ? <><span className="uep-spin"/>Submitting…</> : <>Submit for review</>}
            </button>
          )}
        </div>
      </header>

      {/* pending notice */}
      {postStatus === "pending" && (
        <div className="uep-pending-notice">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          This post is under editorial review. Click <strong>Withdraw &amp; edit</strong> to make changes and resubmit.
        </div>
      )}

      {/* error */}
      {saveState==="error" && errorMsg && (
        <div className="uep-err-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {errorMsg}
          <button onClick={() => { setSaveState("idle"); setErrorMsg("") }} className="uep-err-x">×</button>
        </div>
      )}

      <main className="uep-main" style={{ opacity: postStatus==="pending"?0.6:1, pointerEvents: postStatus==="pending"?"none":"all" }}>

        {/* ══ WRITE ══ */}
        {tab==="write" && (
          <div className="uep-write">
            <textarea
              className="uep-title-inp"
              placeholder="Post title…"
              value={title}
              rows={1}
              onChange={e => setTitle(e.target.value)}
              onInput={e => { const el=e.currentTarget; el.style.height="auto"; el.style.height=el.scrollHeight+"px" }}
            />
            <div className="uep-slug-row">
              <span className="uep-slug-base">yoursite.com/blog/</span>
              <input className="uep-slug-inp" value={slug} placeholder="post-slug"
                onChange={e => { setSlug(e.target.value); setSlugLocked(true) }}/>
              <button className="uep-slug-auto" onClick={() => { setSlugLocked(false); setSlug(slugify(title)) }}>↺ auto</button>
            </div>

            <div className="uep-editor-wrap">
              <PostEditor content={content} onChange={setContent}/>
            </div>

            <div className="uep-field">
              <label className="uep-label">
                Excerpt
                <span className="uep-charcount" style={{marginLeft:"auto",color:excerpt.length>300?"#f87171":""}}>
                  {excerpt.length}/300
                </span>
              </label>
              <textarea className="uep-ta" placeholder="Short summary…" value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3}/>
            </div>
            <div className="uep-field" style={{marginTop:18}}>
              <label className="uep-label">
                SEO title
                <span className="uep-charcount" style={{marginLeft:"auto",color:seoTitle.length>60?"#f87171":""}}>
                  {seoTitle.length}/60
                </span>
              </label>
              <input className="uep-inp" placeholder="Leave blank to use post title" value={seoTitle} onChange={e => setSeoTitle(e.target.value)}/>
            </div>
            <div className="uep-field" style={{marginTop:14}}>
              <label className="uep-label">
                Meta description
                <span className="uep-charcount" style={{marginLeft:"auto",color:seoDesc.length>160?"#f87171":""}}>
                  {seoDesc.length}/160
                </span>
              </label>
              <textarea className="uep-ta" placeholder="Leave blank to use excerpt" value={seoDesc} onChange={e => setSeoDesc(e.target.value)} rows={3}/>
            </div>

            <div className="uep-bottom-row">
              <button className="uep-save-draft" onClick={saveDraft} disabled={saving}>Save draft</button>
              <button className="uep-save-submit" onClick={submitForReview} disabled={saving}>
                {saving?"Submitting…":"Submit for review →"}
              </button>
            </div>
          </div>
        )}

        {/* ══ MEDIA ══ */}
        {tab==="media" && (
          <div className="uep-panel">
            <div className="uep-panel-hd">
              <h2 className="uep-panel-title">Media</h2>
              <p className="uep-panel-sub">Featured image and gallery. Changes are saved when you click Save draft.</p>
            </div>

            <div className="uep-section">
              <div className="uep-section-label">
                Featured image
                {newFeaturedFile && <span className="uep-new-badge">New</span>}
              </div>
              {shownFeatured ? (
                <div className="uep-featured">
                  <img src={shownFeatured} alt="" className="uep-featured-img"/>
                  <div className="uep-featured-overlay">
                    <label className="uep-ov-btn">
                      Replace
                      <input type="file" accept="image/*" hidden onChange={handleNewFeatured}/>
                    </label>
                    <button className="uep-ov-btn uep-ov-btn--danger" onClick={removeShownFeatured}>Remove</button>
                  </div>
                  {newFeaturedFile && (
                    <div className="uep-featured-meta">{newFeaturedFile.name} · {fmtBytes(newFeaturedFile.size)}</div>
                  )}
                </div>
              ) : (
                <label className="uep-dropzone">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{color:"var(--t2)"}}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span className="uep-drop-title">{removeFeaturedFlag?"Removed — upload a new one":"Drop or click to browse"}</span>
                  <span className="uep-drop-sub">PNG, JPG, WebP · max 10 MB</span>
                  <input type="file" accept="image/*" hidden onChange={handleNewFeatured}/>
                </label>
              )}
              {removeFeaturedFlag && !newFeaturedPreview && (
                <button className="uep-text-btn" onClick={() => setRemoveFeaturedFlag(false)}>Undo remove</button>
              )}
            </div>

            <div className="uep-section">
              <div className="uep-section-label">
                Gallery
                {(existingShown.length+newGallery.length)>0 && <span className="uep-count-badge">{existingShown.length+newGallery.length}</span>}
                {newGallery.length>0 && <span className="uep-new-badge">{newGallery.length} pending</span>}
              </div>
              <div className="uep-gallery">
                {existingShown.map(g => (
                  <div key={g.id} className="uep-gallery-item uep-gallery-item--saved">
                    <img src={g.image_url} alt="" className="uep-gallery-img"/>
                    <button className="uep-gallery-rm" onClick={() => setRemovedGalleryIds(p => [...p,g.id])}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <span className="uep-gallery-badge uep-gallery-badge--saved">saved</span>
                  </div>
                ))}
                {newGallery.map((g,i) => (
                  <div key={`n${i}`} className="uep-gallery-item">
                    <img src={g.preview} alt="" className="uep-gallery-img"/>
                    <button className="uep-gallery-rm" onClick={() => setNewGallery(p => p.filter((_,j)=>j!==i))}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <span className="uep-gallery-badge uep-gallery-badge--new">new</span>
                  </div>
                ))}
                {removedGalleryIds.map(id => {
                  const g = existingGallery.find(g=>g.id===id); if (!g) return null
                  return (
                    <div key={`rm${id}`} className="uep-gallery-item uep-gallery-item--removed">
                      <img src={g.image_url} alt="" className="uep-gallery-img uep-gallery-img--faded"/>
                      <button className="uep-gallery-undo" onClick={() => setRemovedGalleryIds(p=>p.filter(x=>x!==id))}>Undo</button>
                    </div>
                  )
                })}
                <label className="uep-gallery-add">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={addNewGallery}/>
                </label>
              </div>
              {removedGalleryIds.length>0 && (
                <p style={{fontSize:12,color:"#f87171",marginTop:10}}>{removedGalleryIds.length} image{removedGalleryIds.length!==1?"s":""} will be deleted on save</p>
              )}
            </div>
          </div>
        )}

      </main>

      <style>{styles}</style>
    </div>
  )
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
  .uep{font-family:var(--font);background:var(--bg);color:var(--t0);min-height:100vh;display:flex;flex-direction:column;animation:uep-in .3s ease both;}
  @keyframes uep-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes uep-spin-a{to{transform:rotate(360deg)}}
  .uep-center{align-items:center;justify-content:center;gap:14px;}

  /* topbar */
  .uep-bar{display:flex;align-items:center;gap:14px;height:54px;padding:0 20px;border-bottom:1px solid var(--b0);background:rgba(9,9,14,.9);backdrop-filter:blur(20px);position:sticky;top:0;z-index:300;flex-shrink:0;}
  .uep-bar-l{display:flex;align-items:center;gap:8px;flex:1;min-width:0;}
  .uep-bar-r{display:flex;align-items:center;gap:8px;flex-shrink:0;}
  .uep-back{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:var(--t1);text-decoration:none;transition:color var(--tr);}
  .uep-back:hover{color:var(--t0);}
  .uep-sep{width:1px;height:13px;background:var(--b1);}
  .uep-crumb{font-size:12.5px;font-weight:500;color:var(--t0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;}
  .uep-nav{display:flex;background:var(--s1);border:1px solid var(--b0);border-radius:8px;padding:3px;gap:1px;}
  .uep-nav-btn{display:inline-flex;align-items:center;gap:5px;font-family:var(--font);font-size:12px;font-weight:500;color:var(--t1);background:transparent;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;transition:background var(--tr),color var(--tr);white-space:nowrap;}
  .uep-nav-btn:hover{color:var(--t0);background:rgba(255,255,255,.04);}
  .uep-nav-btn--on{background:var(--s0);color:var(--t0);box-shadow:inset 0 0 0 1px var(--b0);}
  .uep-badge{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;border-radius:8px;background:var(--acc-a);color:var(--acc-l);font-size:10px;font-weight:600;padding:0 4px;}
  .uep-pill{font-size:11.5px;padding:4px 10px;border-radius:20px;background:rgba(255,255,255,.05);color:var(--t1);white-space:nowrap;}
  .uep-status{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500;padding:4px 10px;border-radius:20px;white-space:nowrap;}
  .uep-status-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;}
  .uep-status--draft{background:rgba(255,255,255,.05);color:var(--t2);}
  .uep-status--pending{background:var(--amb-a);color:var(--amb);}
  .uep-status--pending .uep-status-dot{animation:uep-pulse 1.8s ease-in-out infinite;}
  @keyframes uep-pulse{0%,100%{opacity:1}50%{opacity:.3}}
  .uep-draft-btn{display:inline-flex;align-items:center;gap:6px;font-family:var(--font);font-size:12.5px;font-weight:500;color:var(--t1);background:rgba(255,255,255,.07);border:1px solid var(--b0);border-radius:8px;padding:7px 14px;cursor:pointer;transition:background var(--tr),color var(--tr);}
  .uep-draft-btn:hover:not(:disabled){background:rgba(255,255,255,.11);color:var(--t0);}
  .uep-draft-btn:disabled{opacity:.4;cursor:not-allowed;}
  .uep-submit-btn{display:inline-flex;align-items:center;gap:6px;font-family:var(--font);font-size:13px;font-weight:600;color:#042f1e;background:var(--grn);border:none;border-radius:8px;padding:7px 18px;cursor:pointer;white-space:nowrap;box-shadow:0 4px 16px rgba(52,211,153,.3);transition:background var(--tr),transform var(--tr);}
  .uep-submit-btn:hover:not(:disabled){background:#2dd4a0;transform:translateY(-1px);}
  .uep-submit-btn:disabled{opacity:.6;cursor:not-allowed;}
  .uep-withdraw-btn{display:inline-flex;align-items:center;gap:6px;font-family:var(--font);font-size:13px;font-weight:600;color:var(--amb);background:var(--amb-a);border:1px solid rgba(251,191,36,.25);border-radius:8px;padding:7px 16px;cursor:pointer;transition:background var(--tr);}
  .uep-withdraw-btn:hover:not(:disabled){background:rgba(251,191,36,.2);}
  .uep-spin{width:12px;height:12px;border:2px solid rgba(255,255,255,.25);border-top-color:currentColor;border-radius:50%;animation:uep-spin-a .6s linear infinite;flex-shrink:0;}

  /* banners */
  .uep-pending-notice{display:flex;align-items:center;gap:10px;padding:10px 20px;background:var(--amb-a);border-bottom:1px solid rgba(251,191,36,.2);color:var(--amb);font-size:13.5px;}
  .uep-pending-notice strong{font-weight:600;}
  .uep-err-banner{display:flex;align-items:center;gap:10px;padding:10px 20px;background:var(--red-a);border-bottom:1px solid rgba(248,113,113,.2);color:#fca5a5;font-size:13.5px;}
  .uep-err-x{margin-left:auto;background:none;border:none;color:#fca5a5;font-size:20px;cursor:pointer;line-height:1;padding:0;}

  /* main */
  .uep-main{flex:1;overflow-y:auto;transition:opacity .2s;}
  .uep-write{max-width:780px;margin:0 auto;padding:48px 28px 100px;}
  .uep-panel{max-width:820px;margin:0 auto;padding:44px 28px 100px;}
  .uep-panel-hd{margin-bottom:32px;padding-bottom:22px;border-bottom:1px solid var(--b0);}
  .uep-panel-title{font-family:'Syne',sans-serif;font-weight:800;font-size:28px;color:var(--t0);letter-spacing:-.025em;margin-bottom:5px;}
  .uep-panel-sub{font-size:13.5px;color:var(--t1);line-height:1.6;}

  .uep-title-inp{width:100%;background:transparent;border:none;outline:none;resize:none;overflow:hidden;font-family:'Syne',sans-serif;font-size:clamp(28px,5vw,48px);font-weight:800;line-height:1.15;color:var(--t0);letter-spacing:-.03em;caret-color:var(--acc-l);}
  .uep-title-inp::placeholder{color:var(--t3);}
  .uep-slug-row{display:flex;align-items:center;gap:0;margin-top:12px;margin-bottom:28px;padding:6px 12px;background:var(--s1);border:1px solid var(--b0);border-radius:7px;font-size:12px;}
  .uep-slug-base{color:var(--t2);flex-shrink:0;white-space:nowrap;}
  .uep-slug-inp{flex:1;background:transparent;border:none;outline:none;font-size:12px;font-family:var(--font);color:var(--acc-l);min-width:0;}
  .uep-slug-auto{font-size:11px;color:var(--t2);background:rgba(255,255,255,.06);border:1px solid var(--b0);border-radius:4px;padding:2px 7px;cursor:pointer;font-family:var(--font);flex-shrink:0;margin-left:8px;}
  .uep-editor-wrap{background:var(--s0);border:1px solid var(--b0);border-radius:12px;overflow:hidden;margin-bottom:32px;}
  .uep-editor-wrap:focus-within{border-color:var(--acc-b);box-shadow:0 0 0 3px var(--acc-a);}
  .uep-field{display:flex;flex-direction:column;gap:8px;}
  .uep-label{display:flex;align-items:center;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--t1);}
  .uep-ta{width:100%;background:var(--s1);border:1px solid var(--b0);border-radius:8px;color:var(--t0);font-family:var(--font);font-size:14px;padding:10px 14px;outline:none;resize:vertical;min-height:80px;line-height:1.65;transition:border-color var(--tr),box-shadow var(--tr);}
  .uep-ta:focus{border-color:var(--acc-b);box-shadow:0 0 0 3px var(--acc-a);}
  .uep-ta::placeholder{color:var(--t3);}
  .uep-inp{width:100%;background:var(--s1);border:1px solid var(--b0);border-radius:8px;color:var(--t0);font-family:var(--font);font-size:14px;padding:10px 14px;outline:none;transition:border-color var(--tr),box-shadow var(--tr);}
  .uep-inp:focus{border-color:var(--acc-b);box-shadow:0 0 0 3px var(--acc-a);}
  .uep-charcount{font-size:11px;color:var(--t2);text-align:right;margin-top:-4px;}
  .uep-bottom-row{display:flex;gap:12px;margin-top:32px;}
  .uep-save-draft{flex:1;padding:13px;font-family:var(--font);font-size:14px;font-weight:600;color:var(--t1);background:rgba(255,255,255,.06);border:1px solid var(--b0);border-radius:var(--r);cursor:pointer;transition:background var(--tr),color var(--tr);}
  .uep-save-draft:hover:not(:disabled){background:rgba(255,255,255,.1);color:var(--t0);}
  .uep-save-draft:disabled{opacity:.5;cursor:not-allowed;}
  .uep-save-submit{flex:2;padding:13px;font-family:var(--font);font-size:14px;font-weight:700;color:#042f1e;background:var(--grn);border:none;border-radius:var(--r);cursor:pointer;box-shadow:0 4px 20px rgba(52,211,153,.3);transition:background var(--tr),transform var(--tr);}
  .uep-save-submit:hover:not(:disabled){background:#2dd4a0;transform:translateY(-1px);}
  .uep-save-submit:disabled{opacity:.6;cursor:not-allowed;}

  /* media */
  .uep-section{margin-bottom:36px;}
  .uep-section-label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--t1);margin-bottom:12px;}
  .uep-count-badge{background:var(--acc-a);color:var(--acc-l);border-radius:10px;font-size:10px;padding:1px 7px;font-weight:700;}
  .uep-new-badge{background:var(--amb-a);color:var(--amb);border-radius:10px;font-size:10px;padding:1px 7px;font-weight:600;}
  .uep-dropzone{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:200px;border:1.5px dashed rgba(255,255,255,.09);border-radius:12px;cursor:pointer;transition:background var(--tr),border-color var(--tr);}
  .uep-dropzone:hover{background:rgba(255,255,255,.02);border-color:var(--acc-b);}
  .uep-drop-title{font-size:14px;font-weight:500;color:var(--t1);}
  .uep-drop-sub{font-size:12px;color:var(--t2);}
  .uep-featured{position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--b0);}
  .uep-featured-img{width:100%;height:240px;object-fit:cover;display:block;}
  .uep-featured-overlay{position:absolute;top:10px;right:10px;display:flex;gap:8px;}
  .uep-ov-btn{display:inline-flex;align-items:center;font-size:12px;font-family:var(--font);font-weight:500;padding:7px 13px;border-radius:8px;cursor:pointer;border:none;background:rgba(0,0,0,.55);color:#fff;backdrop-filter:blur(8px);}
  .uep-ov-btn--danger{color:#fca5a5;}
  .uep-featured-meta{position:absolute;bottom:10px;left:12px;font-size:11px;color:rgba(255,255,255,.65);background:rgba(0,0,0,.5);padding:3px 10px;border-radius:20px;backdrop-filter:blur(4px);}
  .uep-text-btn{display:inline-block;margin-top:8px;font-size:12px;color:var(--t2);background:none;border:none;font-family:var(--font);cursor:pointer;text-decoration:underline;padding:0;}
  .uep-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;}
  .uep-gallery-item{position:relative;border-radius:10px;overflow:hidden;border:1px solid var(--b0);aspect-ratio:1;}
  .uep-gallery-item--saved{border-color:rgba(52,211,153,.15);}
  .uep-gallery-item--removed{opacity:.4;}
  .uep-gallery-img{width:100%;height:100%;object-fit:cover;display:block;}
  .uep-gallery-img--faded{filter:grayscale(1);}
  .uep-gallery-rm{position:absolute;top:5px;right:5px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.7);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity var(--tr);}
  .uep-gallery-item:hover .uep-gallery-rm{opacity:1;}
  .uep-gallery-undo{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;background:rgba(0,0,0,.5);border:none;cursor:pointer;font-family:var(--font);}
  .uep-gallery-badge{position:absolute;top:5px;left:5px;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;}
  .uep-gallery-badge--saved{background:rgba(52,211,153,.2);color:var(--grn);}
  .uep-gallery-badge--new{background:var(--amb-a);color:var(--amb);}
  .uep-gallery-add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;aspect-ratio:1;border-radius:10px;border:1.5px dashed rgba(255,255,255,.09);cursor:pointer;color:var(--t2);font-size:11px;transition:background var(--tr),border-color var(--tr),color var(--tr);}
  .uep-gallery-add:hover{border-color:var(--acc-b);color:var(--acc-l);}

  /* locked / success */
  .uep-locked-card{background:var(--s1);border:1px solid var(--b0);border-radius:20px;padding:52px 40px;max-width:460px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;}
  .uep-locked-icon{width:56px;height:56px;border-radius:50%;background:var(--amb-a);color:var(--amb);display:flex;align-items:center;justify-content:center;}
  .uep-success-icon{width:56px;height:56px;border-radius:50%;background:var(--grn-a);color:var(--grn);display:flex;align-items:center;justify-content:center;}
  .uep-locked-title{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--t0);}
  .uep-locked-sub{font-size:14px;color:var(--t1);line-height:1.7;}
  .uep-btn{padding:11px 22px;border-radius:10px;font-family:var(--font);font-size:14px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border:none;transition:all var(--tr);width:100%;}
  .uep-btn--primary{background:var(--grn);color:#042f1e;}
  .uep-btn--primary:hover{background:#2dd4a0;transform:translateY(-1px);}
  .uep-btn--ghost{background:rgba(255,255,255,.06);color:var(--t1);border:1px solid var(--b0);}
  .uep-btn--ghost:hover{background:rgba(255,255,255,.1);color:var(--t0);}

  /* spinner */
  .uep-spinner{width:32px;height:32px;border:2.5px solid rgba(255,255,255,.08);border-top-color:var(--acc-l);border-radius:50%;animation:uep-spin-a .7s linear infinite;}

  @media(max-width:640px){
    .uep-write,.uep-panel{padding:24px 16px 80px;}
    .uep-bar{padding:0 12px;gap:8px;}
    .uep-pill{display:none;}
    .uep-bottom-row{flex-direction:column;}
    .uep-locked-card{padding:36px 20px;}
  }
`