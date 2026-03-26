import { notFound } from "next/navigation";
import BlogDetailClient from "./BlogDetailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

async function getPost(slug: string) {
  const res = await fetch(`${API_URL}/posts/${slug}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data?.data || null;
}

/* ================= SEO METADATA ================= */

export async function generateMetadata({ params }: any) {
  const { slug } = params;

  const post = await getPost(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  const url = `${SITE_URL}/posts/${slug}`;

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,

    keywords: post.keywords?.join(", ") || "",

    alternates: {
      canonical: url,
    },

    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      url,
      type: "article",
      images: [
        {
          url: post.featuredImageUrl || "/default.jpg",
          width: 1200,
          height: 630,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      images: [post.featuredImageUrl || "/default.jpg"],
    },
  };
}
/* ================= PAGE ================= */

export default async function Page({ params }: any) {
  const { slug } = await params;

  const post = await getPost(slug);

  if (!post) notFound();

 return (
  <>
    {/* SEO Schema */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          image: post.featuredImageUrl,
          author: {
            "@type": "Person",
            name: post.display_name || post.username,
          },
          datePublished: post.created_at,
          description: post.excerpt,
        }),
      }}
    />

    <BlogDetailClient post={post} />
  </>
);
}