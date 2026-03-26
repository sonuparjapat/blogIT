"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, Eye, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import PostCard from "@/components/blog/PostCard";

/* ================================
   TABLE OF CONTENTS COMPONENT
================================ */

function TableOfContents({ headings }: { headings: any[] }) {
  if (!headings.length) return null;

  return (
    <div className="bg-gray-300 p-5 rounded-xl mb-8 border">
      <h3 className="font-semibold mb-3">Table of Contents</h3>

      <ul className="space-y-2">
        {headings.map((h, i) => (
          <li key={i} className={h.level === 3 ? "ml-4 text-sm" : ""}>
            <a
              href={`#${h.id}`}
              className="text-blue-600 hover:underline"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================================
   SLUG GENERATOR FOR HEADINGS
================================ */

function slugify(text: string) {
  return text
    ?.toLowerCase()
    ?.replace(/[^\w\s]/g, "")
    ?.replace(/\s+/g, "-");
}

/* ================================
   RENDER TIPTAP NODES
================================ */

function renderNode(node: any, index: number) {
  if (!node) return null;

  if (node.type === "paragraph") {
    const text =
      node?.content?.map((c: any) => c.text ?? "").join("") || "";

    return (
      <p key={index} className="mb-4 text-gray-700 leading-relaxed">
        {text}
      </p>
    );
  }

  if (node.type === "heading") {
    const text =
      node?.content?.map((c: any) => c.text ?? "").join("") || "";

    const id = slugify(text);

    if (node?.attrs?.level === 2) {
      return (
        <h2 id={id} key={index} className="text-2xl font-bold mt-8 mb-3">
          {text}
        </h2>
      );
    }

    if (node?.attrs?.level === 3) {
      return (
        <h3 id={id} key={index} className="text-xl font-semibold mt-6 mb-2">
          {text}
        </h3>
      );
    }
  }

  return null;
}

/* ================================
   MAIN BLOG COMPONENT
================================ */

export default function BlogDetailClient({ post }: any) {
const [relatedPosts, setRelatedPosts] = useState([]);
  /* Extract headings for TOC */
useEffect(() => {
  async function fetchRelated() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/posts/related/${post.id}`
      );

      const data = await res.json();

      setRelatedPosts(data || []);
    } catch (err) {
      console.log("Failed to load related posts");
    }
  }

  if (post?.id) fetchRelated();
}, [post.id]);
  const headings =
    post?.content?.content
      ?.filter((node: any) => node.type === "heading")
      ?.map((node: any) => {
        const text =
          node?.content?.map((c: any) => c.text ?? "").join("") || "";

        return {
          text,
          level: node?.attrs?.level || 2,
          id: slugify(text),
        };
      }) || [];

  const formattedDate = post?.created_at
    ? new Date(post.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 scroll-smooth">

      {/* TITLE */}

      <h1 className="text-4xl font-bold mb-4">
        {post?.title || "Untitled Article"}
      </h1>

      {/* AUTHOR */}

      <p className="text-sm text-gray-500 mb-4">
        By {post?.display_name || post?.username || "Unknown"}
      </p>

      {/* META */}

      <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm mb-6">

        {formattedDate && (
          <span className="flex items-center gap-1">
            <Calendar size={16} />
            {formattedDate}
          </span>
        )}

        {post?.reading_time && (
          <span className="flex items-center gap-1">
            <Clock size={16} />
            {post.reading_time} min read
          </span>
        )}

        <span className="flex items-center gap-1">
          <Eye size={16} />
          {post?.views || 0}
        </span>

      </div>

      {/* FEATURE IMAGE */}

      {post?.featured_image && (
        <div className="relative w-full h-[400px] mb-8">
          <Image
            src={post.featured_image}
            alt={post.title || "Article Image"}
            fill
            sizes="(max-width:768px) 100vw, 768px"
            className="object-cover rounded-xl"
          />
        </div>
      )}

      {/* EXCERPT */}

      {post?.excerpt && (
        <p className="text-lg text-gray-600 mb-6">
          {post.excerpt}
        </p>
      )}

      {/* TABLE OF CONTENTS */}

      <TableOfContents headings={headings} />

      {/* CONTENT */}

      <div className="prose max-w-none">

        {post?.content?.content?.length
          ? post.content.content.map((node: any, i: number) =>
              renderNode(node, i)
            )
          : <p>No content available.</p>}

      </div>

      {/* CATEGORIES */}

      {post?.categories?.length > 0 && (

        <div className="mt-10">

          <h3 className="font-semibold mb-2">Categories</h3>

          <div className="flex flex-wrap gap-2">

            {post.categories.map((c: any, i: number) => (
             <Link
  key={i}
  href={`/category/${c.slug || c}`}
  className="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200"
>
  {c?.name || c}
</Link>
            ))}

          </div>

        </div>

      )}

      {/* TAGS */}

      {post?.tags?.length > 0 && (

        <div className="mt-6">

          <h3 className="font-semibold mb-2">Tags</h3>

          <div className="flex flex-wrap gap-2">

            {post.tags.map((t: any, i: number) => (
              <span
                key={i}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 rounded-full"
              >
                <Tag size={14} />
                {t?.name || t}
              </span>
            ))}

          </div>

        </div>

      )}

      {/* BACK BUTTON */}

      <div className="mt-10">

        <Link
          href="/blog"
          className="text-blue-500 hover:underline"
        >
          ← Back to Blog
        </Link>

      </div>
{/* RELATED POSTS */}

{relatedPosts.length > 0 && (

  <div className="mt-16">

    <h2 className="text-2xl font-bold mb-6">
      Related Articles
    </h2>

    <div className="grid md:grid-cols-2 gap-6">

      {relatedPosts.map((p: any) => (
        <PostCard key={p.id} post={p} />
      ))}

    </div>

  </div>

)}
    </main>
  );
}