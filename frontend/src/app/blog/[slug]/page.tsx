import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://yourdomain.com";

/* ─── types ──────────────────────────────────────────────────────────────── */
type Post = {
  id:              number;
  title:           string;
  slug:            string;
  excerpt:         string;
  content:         any;
  featured_image:  string | null;
  views:           number;
  reading_time:    number;
  created_at:      string;
  updated_at:      string;
  is_premium:      boolean;
  seo_title:       string | null;
  seo_description: string | null;
  username:        string;
  display_name:    string;
  avatar:          string | null;
  bio?:            string | null;
  categories:      { id: number; name: string; slug: string }[];
  tags:            { id: number; name: string; slug: string }[];
  keywords:        string[];
  gallery:         { id: number; url: string }[];
};

type RelatedPost = {
  id:             number;
  title:          string;
  slug:           string;
  featured_image: string | null;
  excerpt:        string;
  reading_time:   number;
  username:       string;
  display_name:   string;
};

/* ─── helpers ────────────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric", month: "long", year: "numeric",
  });
}
function fmtViews(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return String(n ?? 0);
}
function initials(name: string) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
/* Extract plain text from TipTap JSON for SEO description fallback */
function extractText(content: any, max = 200): string {
  if (!content) return "";
  try {
    const texts: string[] = [];
    function walk(node: any) {
      if (node?.text) texts.push(node.text);
      if (node?.content) node.content.forEach(walk);
    }
    walk(typeof content === "string" ? JSON.parse(content) : content);
    return texts.join(" ").replace(/\s+/g, " ").trim().slice(0, max);
  } catch { return ""; }
}
/* Render TipTap JSON to HTML string for the article body */
function renderContent(content: any): string {
  if (!content) return "";
  try {
    const json = typeof content === "string" ? JSON.parse(content) : content;
    function nodeToHtml(node: any): string {
      if (!node) return "";
      switch (node.type) {
        case "doc":
          return (node.content || []).map(nodeToHtml).join("");
        case "paragraph":
          return `<p>${(node.content || []).map(nodeToHtml).join("")}</p>`;
        case "text": {
          let t = node.text || "";
          if (node.marks) {
            for (const m of node.marks) {
              if (m.type === "bold")          t = `<strong>${t}</strong>`;
              if (m.type === "italic")        t = `<em>${t}</em>`;
              if (m.type === "underline")     t = `<u>${t}</u>`;
              if (m.type === "strike")        t = `<s>${t}</s>`;
              if (m.type === "code")          t = `<code>${t}</code>`;
              if (m.type === "link")          t = `<a href="${m.attrs?.href}" target="_blank" rel="noopener noreferrer">${t}</a>`;
            }
          }
          return t;
        }
        case "heading":
          return `<h${node.attrs?.level || 2}>${(node.content || []).map(nodeToHtml).join("")}</h${node.attrs?.level || 2}>`;
        case "bulletList":
          return `<ul>${(node.content || []).map(nodeToHtml).join("")}</ul>`;
        case "orderedList":
          return `<ol>${(node.content || []).map(nodeToHtml).join("")}</ol>`;
        case "listItem":
          return `<li>${(node.content || []).map(nodeToHtml).join("")}</li>`;
        case "blockquote":
          return `<blockquote>${(node.content || []).map(nodeToHtml).join("")}</blockquote>`;
        case "codeBlock":
          return `<pre><code>${(node.content || []).map(nodeToHtml).join("")}</code></pre>`;
        case "horizontalRule":
          return `<hr/>`;
        case "hardBreak":
          return `<br/>`;
        case "image":
          return node.attrs?.src
            ? `<img src="${node.attrs.src}" alt="${node.attrs?.alt || ""}" loading="lazy"/>`
            : "";
        default:
          return (node.content || []).map(nodeToHtml).join("");
      }
    }
    return nodeToHtml(json);
  } catch { return ""; }
}

/* ─── fetchers ───────────────────────────────────────────────────────────── */
async function getPost(slug: string): Promise<Post | null> {
  try {
    console.log(BASE_URL,"base turl",slug,"sluggggggggggggggggggggggggggggggg")
    const res = await fetch(`${BASE_URL}/posts/${slug}`, {
      next: { revalidate: 60 },
    });
    console.log(res,"ressssssssssssssssssssssss")
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data ?? data ?? null;
  } catch { return null; }
}

async function getRelated(postId: number): Promise<RelatedPost[]> {
    console.log(postId,"POGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG")
  try {
    const res = await fetch(`${BASE_URL}/posts/related/${postId}?limit=3`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch { return []; }
}

/* ─── generateMetadata ───────────────────────────────────────────────────── */
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
     const { slug } = await params 
  const post = await getPost(slug);
  if (!post) return { title: "Post not found" };

  const title       = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || extractText(post.content, 160);
  const image       = post.featured_image || `${SITE_URL}/og-image.png`;
  const url         = `${SITE_URL}/blog/${post.slug}`;
  const author      = post.display_name || post.username;

  return {
    title,
    description,
    keywords:   [
      ...(post.keywords ?? []),
      ...(post.tags?.map(t => t.name) ?? []),
      ...(post.categories?.map(c => c.name) ?? []),
    ],
    authors:    [{ name: author }],
    robots: {
      index:    true,
      follow:   true,
      googleBot: {
        index:               true,
        follow:              true,
        "max-image-preview": "large",
        "max-snippet":       -1,
      },
    },
    openGraph: {
      type:            "article",
      url,
      title,
      description,
      siteName:        "BlogHub",
      publishedTime:   post.created_at,
      modifiedTime:    post.updated_at,
      authors:         [author],
      tags:            post.tags?.map(t => t.name) ?? [],
      images: [{
        url,
        width:  1200,
        height: 630,
        alt:    title,
      }],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images:      [image],
      creator:     `@${post.username}`,
    },
    alternates: {
      canonical: url,
    },
  };
}

/* ─── static params for popular posts (optional but boosts SEO) ─────────── */
export async function generateStaticParams() {
  try {
    const res = await fetch(`${BASE_URL}/posts?page=1&limit=50&status=published`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const posts = Array.isArray(data) ? data : (data?.data ?? []);
    return posts.map((p: any) => ({ slug: p.slug }));
  } catch { return []; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default async function PostPage({ params }: any) {    
     const { slug } = await params 
  const post = await getPost(slug);
  console.log(post,"polst")
  if (!post) notFound();

  const related = await getRelated(post.id);
  const contentToRender = post.is_locked
    ? post.preview_content
    : post.content;
   const bodyHtml   = renderContent(contentToRender);
  const author     = post.display_name || post.username;
  const description= post.seo_description || post.excerpt || extractText(post.content, 160);
  const url        = `${SITE_URL}/blog/${post.slug}`;

  /* ── JSON-LD: Article ── */
  const articleJsonLd = {
    "@context":          "https://schema.org",
    "@type":             "BlogPosting",
    "headline":          post.title,
    "description":       description,
    "url":               url,
    "datePublished":     post.created_at,
    "dateModified":      post.updated_at,
    "author": {
      "@type":    "Person",
      "name":     author,
      "url":      `${SITE_URL}/author/${post.username}`,
    },
    "publisher": {
      "@type": "Organization",
      "name":  "BlogHub",
      "logo": { "@type": "ImageObject", "url": `${SITE_URL}/logo.png` },
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    ...(post.featured_image && {
      "image": {
        "@type":  "ImageObject",
        "url":    post.featured_image,
        "width":  1200,
        "height": 630,
      },
    }),
    "keywords": [
      ...(post.keywords ?? []),
      ...(post.tags?.map(t => t.name) ?? []),
    ].join(", "),
    "articleSection": post.categories?.[0]?.name ?? "Blog",
    "wordCount":      bodyHtml.replace(/<[^>]*>/g, " ").split(/\s+/).length,
    "timeRequired":   `PT${post.reading_time}M`,
  };

  /* ── JSON-LD: BreadcrumbList ── */
  const breadcrumbJsonLd = {
    "@context":        "https://schema.org",
    "@type":           "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",  "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": "Blog",  "item": `${SITE_URL}/blog` },
      ...(post.categories?.[0]
        ? [{ "@type": "ListItem", "position": 3, "name": post.categories[0].name, "item": `${SITE_URL}/categories/${post.categories[0].slug}` }]
        : []),
      { "@type": "ListItem", "position": post.categories?.[0] ? 4 : 3, "name": post.title, "item": url },
    ],
  };

  return (
    <>
      {/* ── Structured data ── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}/>

      <Header />

      <main className="pp-main">
        <div className="pp-container">

          {/* ── Breadcrumb ── */}
          <nav className="pp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/" className="pp-bc-link">Home</Link>
            <span className="pp-bc-sep">›</span>
            <Link href="/blog" className="pp-bc-link">Blog</Link>
            {post.categories?.[0] && (
              <>
                <span className="pp-bc-sep">›</span>
                <Link href={`/categories/${post.categories[0].slug}`} className="pp-bc-link">
                  {post.categories[0].name}
                </Link>
              </>
            )}
            <span className="pp-bc-sep">›</span>
            <span className="pp-bc-current">{post.title.slice(0, 40)}{post.title.length > 40 ? "…" : ""}</span>
          </nav>

          <div className="pp-layout">

            {/* ══ ARTICLE ════════════════════════════════════════════════ */}
            <article className="pp-article" itemScope itemType="https://schema.org/BlogPosting">

              {/* hidden SEO meta for crawlers */}
              <meta itemProp="datePublished" content={post.created_at}/>
              <meta itemProp="dateModified"  content={post.updated_at}/>
              <meta itemProp="description"   content={description}/>

              {/* categories + tags */}
              <div className="pp-chips">
                {post.categories?.map(c => (
                  <Link key={c.id} href={`/categories/${c.slug}`} className="pp-chip pp-chip--cat">
                    {c.name}
                  </Link>
                ))}
                {post.is_premium && (
                  <span className="pp-chip pp-chip--premium">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Premium
                  </span>
                )}
              </div>

              {/* title */}
              <h1 className="pp-title" itemProp="headline">{post.title}</h1>

              {/* excerpt / lead */}
              {post.excerpt && (
                <p className="pp-lead">{post.excerpt}</p>
              )}

              {/* meta row */}
              <div className="pp-meta">
                <div className="pp-author-block" itemProp="author" itemScope itemType="https://schema.org/Person">
                  {post.avatar && post.avatar !== "true" && post.avatar !== "false" ? (
                    <Image src={post.avatar} alt={author} width={40} height={40} className="pp-avatar"/>
                  ) : (
                    <span className="pp-avatar pp-avatar--init">{initials(author)}</span>
                  )}
                  <div>
                    <span className="pp-author-name" itemProp="name">{author}</span>
                    <div className="pp-meta-row">
                      <span>{fmtDate(post.created_at)}</span>
                      <span className="pp-sep">·</span>
                      <span>{post.reading_time} min read</span>
                      <span className="pp-sep">·</span>
                      <span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",marginRight:3}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        {fmtViews(post.views)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* featured image */}
              {post.featured_image && (
                <div className="pp-hero-img" itemProp="image" itemScope itemType="https://schema.org/ImageObject">
                  <meta itemProp="url" content={post.featured_image}/>
                  <Image
                    src={post.featured_image}
                    alt={post.title}
                    fill
                    priority
                    sizes="(max-width:768px) 100vw, 800px"
                    className="pp-hero-img-el"
                  />
                </div>
              )}

              {/* article body */}
              <div
                className="pp-body"
                itemProp="articleBody"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
{post.is_locked && (
  <div style={{
    marginTop: "30px",
    padding: "20px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    textAlign: "center"
  }}>
    <h3>🔒 Premium Content</h3>
    <p>Please login or subscribe to read full article.</p>

    <Link href="/login" style={{ marginRight: "10px" }}>
      <button style={{
        padding: "8px 16px",
        borderRadius: "8px",
        border: "none",
        background: "#6366f1",
        color: "#fff",
        cursor: "pointer"
      }}>
        Login
      </button>
    </Link>

    <Link href="/subscribe">
      <button style={{
        padding: "8px 16px",
        borderRadius: "8px",
        border: "none",
        background: "#f59e0b",
        color: "#000",
        cursor: "pointer"
      }}>
        Subscribe
      </button>
    </Link>
  </div>
)}
              {/* tags */}
              {post.tags?.length > 0 && (
                <div className="pp-tags">
                  <span className="pp-tags-label">Tags:</span>
                  {post.tags.map(t => (
                    <Link key={t.id} href={`/blog?tag=${t.slug}`} className="pp-tag">
                      #{t.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* share row */}
              <div className="pp-share">
                <span className="pp-share-label">Share this article</span>
                <div className="pp-share-btns">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="pp-share-btn"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Twitter
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="pp-share-btn"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="pp-share-btn"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook
                  </a>
                </div>
              </div>

            </article>

            {/* ══ SIDEBAR ════════════════════════════════════════════════ */}
            <aside className="pp-sidebar" aria-label="Article sidebar">

              {/* Author card */}
              <div className="pp-sidebar-card">
                <div className="pp-sidebar-label">Written by</div>
                <div className="pp-sidebar-author">
                  {post.avatar && post.avatar !== "true" && post.avatar !== "false" ? (
                    <Image src={post.avatar} alt={author} width={52} height={52} className="pp-sidebar-avatar"/>
                  ) : (
                    <span className="pp-sidebar-avatar pp-avatar--init pp-avatar--lg">{initials(author)}</span>
                  )}
                  <div>
                    <div className="pp-sidebar-author-name">{author}</div>
                    <div className="pp-sidebar-author-handle">@{post.username}</div>
                  </div>
                </div>
                {post.bio && <p className="pp-sidebar-bio">{post.bio}</p>}
              </div>

              {/* Article info */}
              <div className="pp-sidebar-card">
                <div className="pp-sidebar-label">Article info</div>
                <div className="pp-info-rows">
                  {[
                    { label: "Published", value: fmtDate(post.created_at) },
                    { label: "Read time",  value: `${post.reading_time} min` },
                    { label: "Views",      value: fmtViews(post.views) },
                  ].map(r => (
                    <div key={r.label} className="pp-info-row">
                      <span className="pp-info-label">{r.label}</span>
                      <span className="pp-info-value">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories */}
              {post.categories?.length > 0 && (
                <div className="pp-sidebar-card">
                  <div className="pp-sidebar-label">Categories</div>
                  <div className="pp-sidebar-cats">
                    {post.categories.map(c => (
                      <Link key={c.id} href={`/categories/${c.slug}`} className="pp-sidebar-cat">
                        {c.name}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {post.tags?.length > 0 && (
                <div className="pp-sidebar-card">
                  <div className="pp-sidebar-label">Tags</div>
                  <div className="pp-sidebar-tags">
                    {post.tags.map(t => (
                      <Link key={t.id} href={`/blog?tag=${t.slug}`} className="pp-tag">
                        #{t.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </aside>
          </div>

          {/* ═══ RELATED POSTS ═════════════════════════════════════════════ */}
          {related.length > 0 && (
            <section className="pp-related" aria-label="Related articles">
              <div className="pp-related-hd">
                <div className="pp-section-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Related articles
                </div>
              </div>
              <div className="pp-related-grid">
                {related.map(p => (
                  <Link key={p.id} href={`/blog/${p.slug}`} className="pp-related-card">
                    {p.featured_image && (
                      <div className="pp-related-img">
                        <Image src={p.featured_image} alt={p.title} fill sizes="300px" className="pp-related-img-el" loading="lazy"/>
                      </div>
                    )}
                    <div className="pp-related-body">
                      <h3 className="pp-related-title">{p.title}</h3>
                      {p.excerpt && <p className="pp-related-excerpt">{p.excerpt}</p>}
                      <span className="pp-related-meta">{p.display_name || p.username} · {p.reading_time} min</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>

      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        :root {
          --bg:#09090e;--s0:#0f0f17;--s1:#141420;--s2:#1a1a28;
          --b0:rgba(255,255,255,0.06);--b1:rgba(255,255,255,0.11);
          --t0:rgba(255,255,255,0.93);--t1:rgba(255,255,255,0.60);
          --t2:rgba(255,255,255,0.30);--t3:rgba(255,255,255,0.14);
          --acc:#6366f1;--acc-l:#a5b4fc;--acc-a:rgba(99,102,241,0.14);--acc-b:rgba(99,102,241,0.28);
          --grn:#34d399;--grn-a:rgba(52,211,153,0.12);
          --amb:#fbbf24;--amb-a:rgba(251,191,36,0.12);
          --font:'DM Sans',-apple-system,sans-serif;
          --serif:'Lora',Georgia,serif;
          --r:12px;--tr:0.17s cubic-bezier(0.4,0,0.2,1);
        }
        .pp-main{font-family:var(--font);color:var(--t0);}
        .pp-container{max-width:1200px;margin:0 auto;padding:0 24px 100px;}

        /* breadcrumb */
        .pp-breadcrumb{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:28px 0 0;font-size:12.5px;color:var(--t2);}
        .pp-bc-link{color:var(--t2);text-decoration:none;transition:color var(--tr);}
        .pp-bc-link:hover{color:var(--acc-l);}
        .pp-bc-sep{color:var(--t3);}
        .pp-bc-current{color:var(--t1);}

        /* layout */
        .pp-layout{display:grid;grid-template-columns:1fr 300px;gap:52px;align-items:start;margin-top:36px;}

        /* article */
        .pp-article{min-width:0;}
        .pp-chips{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:18px;}
        .pp-chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:500;padding:4px 12px;border-radius:20px;}
        .pp-chip--cat{background:var(--acc-a);color:var(--acc-l);border:1px solid var(--acc-b);text-decoration:none;transition:background var(--tr);}
        .pp-chip--cat:hover{background:rgba(99,102,241,0.2);}
        .pp-chip--premium{background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(239,68,68,0.12));color:#f59e0b;border:1px solid rgba(245,158,11,0.22);}
        .pp-title{font-family:'Syne',sans-serif;font-size:clamp(28px,4vw,46px);font-weight:800;color:var(--t0);line-height:1.12;letter-spacing:-0.03em;margin-bottom:18px;}
        .pp-lead{font-size:18px;color:var(--t1);line-height:1.7;margin-bottom:28px;font-style:italic;border-left:3px solid var(--acc);padding-left:18px;}

        /* meta */
        .pp-meta{margin-bottom:36px;padding-bottom:28px;border-bottom:1px solid var(--b0);}
        .pp-author-block{display:flex;align-items:center;gap:12px;}
        .pp-avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;}
        .pp-avatar--init{background:var(--acc-a);color:var(--acc-l);font-size:13px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;}
        .pp-author-name{font-size:14px;font-weight:600;color:var(--t0);display:block;margin-bottom:3px;}
        .pp-meta-row{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:12.5px;color:var(--t2);}
        .pp-sep{color:var(--t3);}

        /* hero image */
        .pp-hero-img{position:relative;width:100%;aspect-ratio:16/9;border-radius:16px;overflow:hidden;margin-bottom:40px;}
        .pp-hero-img-el{object-fit:cover;}

        /* article body typography */
        .pp-body{font-family:var(--serif);font-size:18px;line-height:1.85;color:rgba(255,255,255,0.82);}
        .pp-body p{margin:0 0 1.5em;}
        .pp-body h1,.pp-body h2,.pp-body h3,.pp-body h4{font-family:'Syne',sans-serif;color:var(--t0);letter-spacing:-0.02em;line-height:1.2;margin:1.8em 0 0.6em;}
        .pp-body h1{font-size:2em;font-weight:800;}
        .pp-body h2{font-size:1.55em;font-weight:700;}
        .pp-body h3{font-size:1.25em;font-weight:700;}
        .pp-body h4{font-size:1.1em;font-weight:600;}
        .pp-body ul,.pp-body ol{padding-left:1.6em;margin:0 0 1.5em;}
        .pp-body li{margin-bottom:0.4em;}
        .pp-body ul li{list-style-type:disc;}
        .pp-body ol li{list-style-type:decimal;}
        .pp-body blockquote{border-left:3px solid var(--acc);padding:4px 0 4px 20px;margin:1.8em 0;color:var(--t1);font-style:italic;}
        .pp-body pre{background:var(--s0);border:1px solid var(--b0);border-radius:10px;padding:20px 22px;overflow-x:auto;margin:1.5em 0;font-family:monospace;font-size:14px;line-height:1.6;}
        .pp-body code{background:var(--s2);color:var(--acc-l);padding:2px 7px;border-radius:5px;font-size:0.85em;font-family:monospace;}
        .pp-body pre code{background:transparent;padding:0;color:rgba(255,255,255,0.85);font-size:inherit;}
        .pp-body img{width:100%;border-radius:12px;margin:1.5em 0;}
        .pp-body a{color:var(--acc-l);text-decoration:underline;text-underline-offset:3px;}
        .pp-body a:hover{color:#fff;}
        .pp-body hr{border:none;border-top:1px solid var(--b0);margin:2.5em 0;}
        .pp-body strong{font-weight:700;color:var(--t0);}
        .pp-body em{font-style:italic;}

        /* tags */
        .pp-tags{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:40px;padding-top:28px;border-top:1px solid var(--b0);}
        .pp-tags-label{font-size:12px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--t2);}
        .pp-tag{display:inline-flex;align-items:center;font-size:12px;font-weight:500;padding:4px 11px;border-radius:20px;background:rgba(255,255,255,0.05);color:var(--t1);border:1px solid var(--b0);text-decoration:none;transition:background var(--tr),color var(--tr);}
        .pp-tag:hover{background:var(--acc-a);color:var(--acc-l);border-color:var(--acc-b);}

        /* share */
        .pp-share{display:flex;align-items:center;gap:14px;margin-top:36px;padding:20px 24px;background:var(--s1);border:1px solid var(--b0);border-radius:14px;flex-wrap:wrap;}
        .pp-share-label{font-size:13px;font-weight:500;color:var(--t1);flex-shrink:0;}
        .pp-share-btns{display:flex;gap:10px;flex-wrap:wrap;}
        .pp-share-btn{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;padding:7px 14px;border-radius:8px;background:rgba(255,255,255,0.06);color:var(--t1);border:1px solid var(--b0);text-decoration:none;transition:background var(--tr),color var(--tr),border-color var(--tr);}
        .pp-share-btn:hover{background:rgba(255,255,255,0.1);color:var(--t0);border-color:var(--b1);}

        /* sidebar */
        .pp-sidebar{position:sticky;top:88px;display:flex;flex-direction:column;gap:16px;}
        .pp-sidebar-card{background:var(--s1);border:1px solid var(--b0);border-radius:14px;padding:20px;}
        .pp-sidebar-label{font-size:10.5px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--t2);margin-bottom:14px;}
        .pp-sidebar-author{display:flex;align-items:center;gap:12px;}
        .pp-sidebar-avatar{width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0;}
        .pp-avatar--lg{font-size:17px;}
        .pp-sidebar-author-name{font-size:14.5px;font-weight:600;color:var(--t0);display:block;margin-bottom:3px;}
        .pp-sidebar-author-handle{font-size:12px;color:var(--t2);}
        .pp-sidebar-bio{font-size:13px;color:var(--t1);line-height:1.6;margin-top:12px;padding-top:12px;border-top:1px solid var(--b0);}
        .pp-info-rows{display:flex;flex-direction:column;gap:0;}
        .pp-info-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--b0);font-size:13px;}
        .pp-info-row:last-child{border-bottom:none;}
        .pp-info-label{color:var(--t2);}
        .pp-info-value{color:var(--t0);font-weight:500;}
        .pp-sidebar-cats{display:flex;flex-direction:column;gap:4px;}
        .pp-sidebar-cat{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:8px;background:rgba(255,255,255,0.03);color:var(--t1);font-size:13px;font-weight:500;text-decoration:none;border:1px solid var(--b0);transition:background var(--tr),color var(--tr);}
        .pp-sidebar-cat:hover{background:var(--acc-a);color:var(--acc-l);border-color:var(--acc-b);}
        .pp-sidebar-tags{display:flex;flex-wrap:wrap;gap:7px;}

        /* related */
        .pp-related{margin-top:72px;padding-top:56px;border-top:1px solid var(--b0);}
        .pp-related-hd{margin-bottom:28px;}
        .pp-section-label{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--t2);}
        .pp-section-label svg{color:var(--acc-l);}
        .pp-related-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;}
        .pp-related-card{display:flex;flex-direction:column;background:var(--s1);border:1px solid var(--b0);border-radius:14px;overflow:hidden;text-decoration:none;transition:border-color var(--tr),transform var(--tr);}
        .pp-related-card:hover{border-color:var(--b1);transform:translateY(-2px);}
        .pp-related-img{position:relative;aspect-ratio:16/9;overflow:hidden;}
        .pp-related-img-el{object-fit:cover;transition:transform 0.4s ease;}
        .pp-related-card:hover .pp-related-img-el{transform:scale(1.05);}
        .pp-related-body{padding:16px;}
        .pp-related-title{font-size:14px;font-weight:600;color:var(--t0);line-height:1.35;margin-bottom:7px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .pp-related-excerpt{font-size:12.5px;color:var(--t1);line-height:1.6;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .pp-related-meta{font-size:11.5px;color:var(--t2);}

        /* responsive */
        @media(max-width:1024px){.pp-layout{grid-template-columns:1fr;}.pp-sidebar{position:static;}}
        @media(max-width:768px){.pp-related-grid{grid-template-columns:1fr 1fr;}.pp-container{padding:0 16px 80px;}}
        @media(max-width:480px){.pp-related-grid{grid-template-columns:1fr;}.pp-title{font-size:28px;}.pp-body{font-size:16px;}}
      `}</style>
    </>
  );
}