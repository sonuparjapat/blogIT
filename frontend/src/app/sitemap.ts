// app/sitemap.ts
// Dynamic sitemap — automatically includes all published posts + categories
// Next.js serves this at /sitemap.xml automatically

import type { MetadataRoute } from "next";

const BASE_URL  = process.env.NEXT_PUBLIC_API_URL!;
const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL || "https://yourdomain.com";

type Post = {
  slug:       string;
  updated_at: string;
  created_at: string;
  categories: { id: number; name: string; slug: string }[];
};
type Category = {
  slug:       string;
  updated_at?: string;
};

async function getAllPosts(): Promise<Post[]> {
  try {
    // Fetch up to 1000 posts for the sitemap (increase limit if you have more)
    const res = await fetch(
      `${BASE_URL}/posts?page=1&limit=1000&status=published`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch { return []; }
}

async function getAllCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${BASE_URL}/categories`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch { return []; }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([
    getAllPosts(),
    getAllCategories(),
  ]);

  /* ── static pages ── */
  const staticPages: MetadataRoute.Sitemap = [
    {
      url:              SITE_URL,
      lastModified:     new Date(),
      changeFrequency:  "daily",
      priority:         1.0,
    },
    {
      url:              `${SITE_URL}/blog`,
      lastModified:     new Date(),
      changeFrequency:  "daily",
      priority:         0.9,
    },
    {
      url:              `${SITE_URL}/register`,
      lastModified:     new Date(),
      changeFrequency:  "monthly",
      priority:         0.5,
    },
    {
      url:              `${SITE_URL}/login`,
      lastModified:     new Date(),
      changeFrequency:  "monthly",
      priority:         0.4,
    },
  ];

  /* ── post pages ── */
  const postPages: MetadataRoute.Sitemap = posts.map(post => ({
    url:             `${SITE_URL}/blog/${post.slug}`,
    lastModified:    new Date(post.updated_at || post.created_at),
    changeFrequency: "weekly" as const,
    priority:        0.8,
  }));

  /* ── category pages ── */
  const categoryPages: MetadataRoute.Sitemap = categories.map(cat => ({
    url:             `${SITE_URL}/categories/${cat.slug}`,
    lastModified:    new Date(),
    changeFrequency: "weekly" as const,
    priority:        0.6,
  }));

  return [...staticPages, ...postPages, ...categoryPages];
}