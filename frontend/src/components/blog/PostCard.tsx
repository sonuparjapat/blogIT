"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, Eye } from "lucide-react";

/* ─── helpers ──────────────────────────────────────────────────────────── */
function fmtViews(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return String(n ?? 0);
}
function initials(name: string) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const CAT_COLORS = [
  "#a5b4fc","#34d399","#fbbf24","#f87171",
  "#38bdf8","#fb923c","#c084fc","#2dd4bf",
];
function catColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return CAT_COLORS[Math.abs(h) % CAT_COLORS.length];
}

/* ═══════════════════════════════════════════════════════════════════════════
   POST CARD
   Accepts BOTH:
     • raw backend shape  (featured_image, display_name, reading_time …)
     • adapted shape      (featuredImageUrl, author.displayName …)
═══════════════════════════════════════════════════════════════════════════ */
export default function PostCard({ post }: { post: any }) {
  if (!post) return null;

  /* ── normalise fields so both shapes work ── */
  const image       = post.featured_image   ?? post.featuredImageUrl   ?? null;
  const views       = post.views            ?? post.viewCount          ?? 0;
  const readTime    = post.reading_time     ?? post.readingTimeMinutes ?? 1;
  const createdAt   = post.created_at       ?? post.createdAt          ?? post.publishedAt ?? "";
  const authorName  = post.display_name     ?? post.author?.displayName ?? post.username ?? post.author?.username ?? "Author";
  const authorAvatar= post.avatar && post.avatar !== "true" && post.avatar !== "false"
                        ? post.avatar
                        : (post.author?.avatarUrl ?? null);
  const category    = post.categories?.[0]  ?? post.category           ?? null;
  const isPremium   = post.is_premium       ?? false;

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  const accent = catColor(category?.name ?? post.title ?? "");

  return (
    <Link href={`/blog/${post.slug}`} className="pc-root group">

      {/* ── Image ── */}
      <div className="pc-img-wrap">
        {image ? (
          <Image
            src={image}
            alt={post.title}
            fill
            sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
            className="pc-img"
            loading="lazy"
          />
        ) : (
          <div className="pc-img-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}

        {/* premium badge */}
        {isPremium && (
          <span className="pc-premium">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Premium
          </span>
        )}

        {/* category chip */}
        {category && (
          <span
            className="pc-cat"
            style={{ background: `${accent}18`, color: accent, borderColor: `${accent}35` }}
          >
            {category.name}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="pc-body">

        {/* title */}
        <h3 className="pc-title">{post.title}</h3>

        {/* excerpt */}
        {post.excerpt && (
          <p className="pc-excerpt">{post.excerpt}</p>
        )}

        {/* footer */}
        <div className="pc-footer">
          {/* author */}
          <div className="pc-author">
            {authorAvatar ? (
              <Image
                src={authorAvatar}
                alt={authorName}
                width={22}
                height={22}
                className="pc-avatar"
              />
            ) : (
              <span className="pc-avatar pc-avatar--init">
                {initials(authorName)}
              </span>
            )}
            <span className="pc-author-name">{authorName}</span>
          </div>

          {/* stats */}
          <div className="pc-stats">
            {formattedDate && (
              <span className="pc-stat">
                <Calendar size={11}/>
                {formattedDate}
              </span>
            )}
            <span className="pc-stat">
              <Clock size={11}/>
              {readTime}m
            </span>
            <span className="pc-stat">
              <Eye size={11}/>
              {fmtViews(views)}
            </span>
          </div>
        </div>

      </div>

      {/* accent bar revealed on hover */}
      <span className="pc-bar" style={{ background: accent }}/>

      <style jsx>{`
        .pc-root {
          position: relative;
          display: flex;
          flex-direction: column;
          border-radius: 16px;
          overflow: hidden;
          background: #141420;
          border: 1px solid rgba(255,255,255,0.06);
          text-decoration: none;
          transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
          height: 100%;
        }
        .pc-root:hover {
          border-color: rgba(255,255,255,0.13);
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
        }

        /* image */
        .pc-img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #0f0f17;
          flex-shrink: 0;
        }
        .pc-img {
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .pc-root:hover .pc-img {
          transform: scale(1.06);
        }
        .pc-img-empty {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.12);
        }

        /* badges */
        .pc-premium {
          position: absolute;
          top: 10px;
          right: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 20px;
          letter-spacing: 0.04em;
        }
        .pc-cat {
          position: absolute;
          bottom: 10px;
          left: 10px;
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          font-weight: 500;
          padding: 3px 9px;
          border-radius: 20px;
          border: 1px solid;
          backdrop-filter: blur(8px);
        }

        /* body */
        .pc-body {
          padding: 16px 18px 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .pc-title {
          font-size: 15px;
          font-weight: 700;
          color: rgba(255,255,255,0.93);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          letter-spacing: -0.01em;
          transition: color 0.15s;
        }
        .pc-root:hover .pc-title {
          color: #fff;
        }
        .pc-excerpt {
          font-size: 13px;
          color: rgba(255,255,255,0.48);
          line-height: 1.65;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }

        /* footer */
        .pc-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .pc-author {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }
        .pc-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .pc-avatar--init {
          background: rgba(99,102,241,0.2);
          color: #a5b4fc;
          font-size: 8px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .pc-author-name {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pc-stats {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .pc-stat {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          color: rgba(255,255,255,0.28);
          white-space: nowrap;
        }

        /* accent bar */
        .pc-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          opacity: 0;
          transition: opacity 0.18s ease;
        }
        .pc-root:hover .pc-bar {
          opacity: 0.7;
        }
      `}</style>
    </Link>
  );
}