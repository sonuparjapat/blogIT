import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import PostCard from "@/components/blog/PostCard";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

/* ─── types ──────────────────────────────────────────────────────────────── */
type Post = {
  id:             number;
  title:          string;
  slug:           string;
  excerpt:        string;
  featured_image: string | null;
  views:          number;
  reading_time:   number;
  created_at:     string;
  is_premium:     boolean;
  username:       string;
  display_name:   string;
  avatar:         string | null;
  categories:     { id: number; name: string; slug: string }[];
  tags:           { id: number; name: string; slug: string }[];
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

/* ─── fetchers ───────────────────────────────────────────────────────────── */
async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${BASE_URL}/posts?page=1&limit=13&status=published`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch { return []; }
}

async function getTrending(): Promise<Post[]> {
  try {
    const res = await fetch(`${BASE_URL}/posts/trending?limit=3`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch { return []; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   METADATA — full SEO
═══════════════════════════════════════════════════════════════════════════ */
export const metadata: Metadata = {
  title:       "Blog — Latest Articles, Tutorials & Guides",
  description: "Browse the latest articles, tutorials, and in-depth guides on technology, programming, design and more. Written by expert creators.",
  keywords:    ["blog", "articles", "tutorials", "technology", "programming", "design", "guides"],
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
    type:        "website",
    url:         "https://yourdomain.com/blog",
    title:       "Blog — Latest Articles, Tutorials & Guides",
    description: "Browse the latest articles, tutorials, and in-depth guides.",
    siteName:    "BlogHub",
    images: [{ url: "https://yourdomain.com/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Blog — Latest Articles, Tutorials & Guides",
    description: "Browse the latest articles, tutorials, and in-depth guides.",
    images:      ["https://yourdomain.com/og-image.png"],
  },
  alternates: {
    canonical: "https://yourdomain.com/blog",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE  (server component — fully SSR)
═══════════════════════════════════════════════════════════════════════════ */
export default async function BlogPage() {
  const [posts, trending] = await Promise.all([getPosts(), getTrending()]);

  const hero = posts[0] ?? null;
  const rest = posts.slice(1);

  /* JSON-LD — BlogPosting list for rich results */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type":    "Blog",
    "name":     "BlogHub",
    "url":      "https://yourdomain.com/blog",
    "description": "Latest articles, tutorials and guides.",
    "blogPost": posts.slice(0, 10).map(p => ({
      "@type":         "BlogPosting",
      "headline":      p.title,
      "description":   p.excerpt,
      "url":           `https://yourdomain.com/blog/${p.slug}`,
      "datePublished": p.created_at,
      "author": {
        "@type": "Person",
        "name":  p.display_name || p.username,
      },
      ...(p.featured_image && {
        "image": { "@type": "ImageObject", "url": p.featured_image },
      }),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <main className="bp-main">

        {/* ── Page header ── */}
        <div className="bp-page-hd">
          <div className="bp-page-hd-inner">
            <span className="bp-eyebrow">
              <span className="bp-eyebrow-dot"/>
              The Blog
            </span>
            <h1 className="bp-h1">Stories. Tutorials. Ideas.</h1>
            <p className="bp-h1-sub">
              In-depth articles on technology, programming, design and the craft of building things.
            </p>
          </div>
          {/* decorative orbs */}
          <div className="bp-orb bp-orb--1"/>
          <div className="bp-orb bp-orb--2"/>
        </div>

        <div className="bp-container">

          {/* ═══ HERO POST ═══════════════════════════════════════════════ */}
          {hero && (
            <section className="bp-section" aria-label="Featured article">
              <Link href={`/blog/${hero.slug}`} className="bp-hero">

                {/* image */}
                <div className="bp-hero-img">
                  {hero.featured_image ? (
                    <Image
                      src={hero.featured_image}
                      alt={hero.title}
                      fill
                      priority
                      sizes="(max-width:768px) 100vw, 1200px"
                      className="bp-hero-img-el"
                    />
                  ) : (
                    <div className="bp-hero-img-empty">
                      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  )}
                  <div className="bp-hero-overlay"/>
                </div>

                {/* content */}
                <div className="bp-hero-body">
                  <div className="bp-hero-top">
                    {hero.categories?.[0] && (
                      <span className="bp-hero-cat">{hero.categories[0].name}</span>
                    )}
                    {hero.is_premium && (
                      <span className="bp-hero-premium">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        Premium
                      </span>
                    )}
                  </div>

                  <h2 className="bp-hero-title">{hero.title}</h2>

                  {hero.excerpt && (
                    <p className="bp-hero-excerpt">{hero.excerpt}</p>
                  )}

                  <div className="bp-hero-meta">
                    <span className="bp-hero-author">
                      {hero.display_name || hero.username}
                    </span>
                    <span className="bp-hero-sep">·</span>
                    <span>{fmtDate(hero.created_at)}</span>
                    <span className="bp-hero-sep">·</span>
                    <span>{hero.reading_time} min read</span>
                    <span className="bp-hero-sep">·</span>
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",marginRight:3}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      {fmtViews(hero.views)}
                    </span>
                  </div>

                  <span className="bp-hero-cta">
                    Read article
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                </div>
              </Link>
            </section>
          )}

          {/* ═══ TRENDING ════════════════════════════════════════════════ */}
          {trending.length > 0 && (
            <section className="bp-section" aria-label="Trending articles">
              <div className="bp-section-hd">
                <div className="bp-section-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  Trending now
                </div>
                <Link href="/blog?sort=trending" className="bp-view-all">
                  See all
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </Link>
              </div>
              <div className="bp-grid-3">
                {trending.map(post => (
                  <PostCard key={post.id} post={post}/>
                ))}
              </div>
            </section>
          )}

          {/* ═══ LATEST ══════════════════════════════════════════════════ */}
          {rest.length > 0 && (
            <section className="bp-section" aria-label="Latest articles">
              <div className="bp-section-hd">
                <div className="bp-section-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Latest articles
                </div>
              </div>
              <div className="bp-grid-3">
                {rest.map(post => (
                  <PostCard key={post.id} post={post}/>
                ))}
              </div>
            </section>
          )}

          {/* ═══ EMPTY STATE ═════════════════════════════════════════════ */}
          {posts.length === 0 && (
            <div className="bp-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <h2>No articles yet</h2>
              <p>Check back soon — new content is on its way.</p>
            </div>
          )}

        </div>
      </main>

      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        :root {
          --bg: #09090e; --s0: #0f0f17; --s1: #141420; --s2: #1a1a28;
          --b0: rgba(255,255,255,0.06); --b1: rgba(255,255,255,0.11);
          --t0: rgba(255,255,255,0.93); --t1: rgba(255,255,255,0.58);
          --t2: rgba(255,255,255,0.30);
          --acc: #6366f1; --acc-l: #a5b4fc; --acc-a: rgba(99,102,241,0.14);
          --grn: #34d399;
          --font: 'DM Sans', -apple-system, sans-serif;
          --r: 14px; --tr: 0.18s cubic-bezier(0.4,0,0.2,1);
        }

        .bp-main { font-family: var(--font); color: var(--t0); }

        /* ── page header ── */
        .bp-page-hd {
          position: relative; overflow: hidden;
          padding: 80px 24px 72px;
          text-align: center;
          border-bottom: 1px solid var(--b0);
        }
        .bp-page-hd-inner { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; }
        .bp-orb { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(72px); }
        .bp-orb--1 { width: 500px; height: 500px; top: -200px; left: -100px; background: rgba(99,102,241,0.14); }
        .bp-orb--2 { width: 400px; height: 400px; bottom: -150px; right: -80px; background: rgba(52,211,153,0.09); }
        .bp-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11.5px; font-weight: 500; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--acc-l);
          margin-bottom: 18px;
        }
        .bp-eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--acc-l);
          box-shadow: 0 0 8px rgba(165,180,252,0.7);
          animation: bp-pulse 2.2s ease-in-out infinite;
        }
        @keyframes bp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        .bp-h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(36px, 6vw, 64px);
          font-weight: 800; letter-spacing: -0.03em;
          line-height: 1.05; color: var(--t0);
          margin-bottom: 18px;
        }
        .bp-h1-sub { font-size: clamp(15px,2vw,18px); color: var(--t1); line-height: 1.7; max-width: 500px; margin: 0 auto; }

        /* ── container ── */
        .bp-container { max-width: 1200px; margin: 0 auto; padding: 0 24px 100px; }
        .bp-section { margin-top: 72px; }
        .bp-section-hd {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 28px;
        }
        .bp-section-label {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--t2);
        }
        .bp-section-label svg { color: var(--acc-l); }
        .bp-view-all {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 13px; font-weight: 500; color: var(--acc-l);
          text-decoration: none; transition: opacity var(--tr);
        }
        .bp-view-all:hover { opacity: 0.7; }

        /* ── hero ── */
        .bp-hero {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0;
          background: var(--s1); border: 1px solid var(--b0);
          border-radius: 22px; overflow: hidden; text-decoration: none;
          transition: border-color var(--tr), transform var(--tr), box-shadow var(--tr);
        }
        .bp-hero:hover { border-color: var(--b1); transform: translateY(-3px); box-shadow: 0 24px 60px rgba(0,0,0,0.45); }
        .bp-hero-img { position: relative; aspect-ratio: 4/3; overflow: hidden; }
        .bp-hero-img-el { object-fit: cover; transition: transform 0.6s ease; }
        .bp-hero:hover .bp-hero-img-el { transform: scale(1.04); }
        .bp-hero-img-empty { width:100%;height:100%;background:var(--s2);display:flex;align-items:center;justify-content:center;color:var(--t2); }
        .bp-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to right, transparent 60%, rgba(20,20,32,0.4)); }
        .bp-hero-body {
          padding: 44px 48px;
          display: flex; flex-direction: column;
          justify-content: center; gap: 16px;
        }
        .bp-hero-top { display: flex; align-items: center; gap: 10px; }
        .bp-hero-cat {
          display: inline-flex; align-items: center;
          font-size: 11.5px; font-weight: 500;
          padding: 4px 12px; border-radius: 20px;
          background: var(--acc-a); color: var(--acc-l);
          border: 1px solid rgba(99,102,241,0.25);
        }
        .bp-hero-premium {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; font-weight: 700;
          padding: 4px 10px; border-radius: 20px;
          background: linear-gradient(135deg,rgba(245,158,11,0.15),rgba(239,68,68,0.15));
          color: #f59e0b; border: 1px solid rgba(245,158,11,0.25);
        }
        .bp-hero-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(22px, 2.8vw, 32px);
          font-weight: 800; color: var(--t0);
          line-height: 1.2; letter-spacing: -0.025em;
        }
        .bp-hero-excerpt {
          font-size: 14.5px; color: var(--t1);
          line-height: 1.7;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
        }
        .bp-hero-meta {
          display: flex; align-items: center; flex-wrap: wrap; gap: 7px;
          font-size: 12.5px; color: var(--t2);
        }
        .bp-hero-sep { color: var(--b1); }
        .bp-hero-author { font-weight: 500; color: var(--t1); }
        .bp-hero-cta {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13.5px; font-weight: 600; color: var(--acc-l);
          margin-top: 4px;
          transition: gap var(--tr);
        }
        .bp-hero:hover .bp-hero-cta { gap: 9px; }

        /* ── post grids ── */
        .bp-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 20px; }

        /* ── empty ── */
        .bp-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 14px; padding: 100px 24px; text-align: center; color: var(--t1);
          margin-top: 60px;
        }
        .bp-empty svg { color: var(--t2); }
        .bp-empty h2 { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700; color: var(--t0); }
        .bp-empty p { font-size: 14px; color: var(--t1); }

        /* ── responsive ── */
        @media (max-width: 900px) {
          .bp-hero { grid-template-columns: 1fr; }
          .bp-hero-img { aspect-ratio: 16/9; }
          .bp-hero-body { padding: 28px 28px 32px; }
          .bp-grid-3 { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .bp-page-hd { padding: 60px 20px 52px; }
          .bp-container { padding: 0 16px 80px; }
          .bp-grid-3 { grid-template-columns: 1fr; }
          .bp-hero-body { padding: 20px; }
        }
      `}</style>
    </>
  );
}