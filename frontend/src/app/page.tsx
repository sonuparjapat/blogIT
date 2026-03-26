// ─────────────────────────────────────────────────────────────────────────────
// FILE 1:  app/page.tsx   ← SERVER COMPONENT (SSR + SEO)
// ─────────────────────────────────────────────────────────────────────────────
// This file does the data fetching on the server so Google crawlers see
// fully-rendered HTML instead of an empty shell. It also exports
// generateMetadata for dynamic <title>, <meta>, og: and twitter: tags.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import HomeClient from "@/components/home/HomeClient";

/* ─── types ──────────────────────────────────────────────────────────────── */
export type Post = {
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

export type Category = {
  id:          number;
  name:        string;
  slug:        string;
  description: string | null;
  postCount?:  number;
  color?:      string | null;
};

/* ─── static metadata (fast — no API call needed) ────────────────────────── */
export const metadata: Metadata = {
  title:       "BlogHub — Stories, Ideas & Insights",
  description: "Discover the best articles on technology, programming, design and more. Read, write and share ideas with a growing community of creators.",
  keywords:    ["blog", "technology", "programming", "design", "articles", "tutorials"],
  authors:     [{ name: "BlogHub" }],
  creator:     "BlogHub",
  publisher:   "BlogHub",
  robots: {
    index:          true,
    follow:         true,
    googleBot: {
      index:               true,
      follow:              true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet":       -1,
    },
  },
  openGraph: {
    type:        "website",
    locale:      "en_US",
    url:         "https://yourdomain.com",
    siteName:    "BlogHub",
    title:       "BlogHub — Stories, Ideas & Insights",
    description: "Discover the best articles on technology, programming, design and more.",
    images: [
      {
        url:    "https://yourdomain.com/og-image.png",   // replace with your OG image
        width:  1200,
        height: 630,
        alt:    "BlogHub",
      },
    ],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "BlogHub — Stories, Ideas & Insights",
    description: "Discover the best articles on technology, programming, design and more.",
    images:      ["https://yourdomain.com/og-image.png"],
    creator:     "@yourtwitterhandle",
  },
  alternates: {
    canonical: "https://yourdomain.com",
  },
};

/* ─── server-side data fetch ─────────────────────────────────────────────── */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function fetchPosts(): Promise<Post[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/posts?page=1&limit=9&status=published`,
      {
        next: { revalidate: 60 },   // ISR — revalidate every 60 seconds
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch {
    return [];
  }
}

async function fetchTrending(): Promise<Post[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/posts/trending?limit=5`,
      {
        next: { revalidate: 300 },  // trending changes less often — 5 min
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch {
    return [];
  }
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/categories`,
      {
        next: { revalidate: 600 }, // categories rarely change — 10 min
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch {
    return [];
  }
}

/* ─── JSON-LD structured data ────────────────────────────────────────────── */
function buildJsonLd(posts: Post[]) {
  return {
    "@context":   "https://schema.org",
    "@type":      "WebSite",
    "name":       "BlogHub",
    "url":        "https://yourdomain.com",
    "description":"A modern blogging platform for developers and creators.",
    "potentialAction": {
      "@type":       "SearchAction",
      "target":      "https://yourdomain.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
    "publisher": {
      "@type": "Organization",
      "name":  "BlogHub",
      "logo": {
        "@type": "ImageObject",
        "url":   "https://yourdomain.com/logo.png",
      },
    },
    ...(posts.length > 0 && {
      "mainEntity": {
        "@type":           "ItemList",
        "name":            "Latest Articles",
        "numberOfItems":   posts.length,
        "itemListElement": posts.slice(0, 6).map((p, i) => ({
          "@type":    "ListItem",
          "position": i + 1,
          "item": {
            "@type":       "BlogPosting",
            "headline":    p.title,
            "description": p.excerpt,
            "url":         `https://yourdomain.com/blog/${p.slug}`,
            "datePublished":  p.created_at,
            "dateModified":   p.created_at,
            "author": {
              "@type": "Person",
              "name":  p.display_name || p.username,
            },
            ...(p.featured_image && {
              "image": {
                "@type": "ImageObject",
                "url":   p.featured_image,
              },
            }),
          },
        })),
      },
    }),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SERVER COMPONENT — fetches all data, renders SSR shell + passes to client
═══════════════════════════════════════════════════════════════════════════ */
export default async function HomePage() {
  // All 3 fetch in parallel on the server
  const [posts, trendingPosts, categories] = await Promise.all([
    fetchPosts(),
    fetchTrending(),
    fetchCategories(),
  ]);

  const jsonLd = buildJsonLd(posts);

  return (
    <>
      {/* ── JSON-LD structured data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── SSR-rendered content for crawlers ── */}
      {/* This invisible section gives Google fully rendered HTML */}
      <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }} aria-hidden="true">
        <h1>BlogHub — Stories, Ideas &amp; Insights</h1>
        {posts.slice(0, 6).map(p => (
          <article key={p.id}>
            <h2><a href={`/blog/${p.slug}`}>{p.title}</a></h2>
            <p>{p.excerpt}</p>
            <span>By {p.display_name || p.username}</span>
            {p.categories.map(c => (
              <a key={c.id} href={`/categories/${c.slug}`}>{c.name}</a>
            ))}
          </article>
        ))}
        {categories.map(c => (
          <a key={c.id} href={`/categories/${c.slug}`}>{c.name}</a>
        ))}
      </div>

      {/* ── Interactive client component ── */}
      <HomeClient
        initialPosts={posts}
        initialTrending={trendingPosts}
        initialCategories={categories}
      />
    </>
  );
}