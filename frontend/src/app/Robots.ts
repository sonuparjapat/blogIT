// app/robots.ts
// Next.js serves this at /robots.txt automatically

import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://yourdomain.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow all crawlers on public content
        userAgent: "*",
        allow:     "/",
        disallow: [
          "/admin/",        // admin panel — never index
          "/dashboard/",    // user dashboard
          "/api/",          // API routes
          "/login",         // auth pages (optional — some prefer to allow)
          "/register",
          "/_next/",        // Next.js internals
        ],
      },
      {
        // Block AI training crawlers (optional — remove if you don't mind)
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai"],
        disallow: ["/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host:    SITE_URL,
  };
}