import PostCard from "@/components/blog/PostCard";
import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/* ================= FETCH POSTS ================= */

async function getCategoryPosts(slug: string) {

  const res = await fetch(
    `${API_URL}/posts/category/${slug}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;

  const data = await res.json();

  return data?.data || data || [];
}

/* ================= PAGE ================= */

export default async function CategoryPage({ params }: any) {

  const { slug } = params;

  const posts = await getCategoryPosts(slug);

  if (!posts) notFound();

  return (

    <main className="max-w-6xl mx-auto px-4 py-10">

      {/* TITLE */}

      <h1 className="text-3xl font-bold mb-8 capitalize">
        {slug.replace("-", " ")}
      </h1>

      {/* POSTS */}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

        {posts.map((post:any)=>(
          <PostCard key={post.id} post={post} />
        ))}

      </div>

    </main>

  );
}