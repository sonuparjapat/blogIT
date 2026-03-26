// ─────────────────────────────────────────────────────────────────────────────
// FILE 2:  components/home/HomeClient.tsx   ← CLIENT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
// Receives SSR data as props (already fetched by the server component).
// Handles all interactivity: auth state, motion animations, etc.
// UI is IDENTICAL to the original — only the data wiring changed.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Sparkles, PenSquare, Users, Zap } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import PostCard from "@/components/blog/PostCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { Post, Category } from "@/app/page";

/* ─── adapter — maps backend flat shape → PostCard expected shape ─────────
   PostCard accepts both shapes already (see PostCard.tsx),
   but keeping the adapter here in case other pages need it too.
──────────────────────────────────────────────────────────────────────────── */
function adaptPost(p: Post) {
  return {
    id:                   String(p.id),
    title:                p.title,
    slug:                 p.slug,
    excerpt:              p.excerpt || "",
    featuredImageUrl:     p.featured_image,
    featured_image:       p.featured_image,    // pass both — PostCard handles either
    viewCount:            p.views ?? 0,
    views:                p.views ?? 0,
    likeCount:            0,
    commentCount:         0,
    readingTimeMinutes:   p.reading_time ?? 1,
    reading_time:         p.reading_time ?? 1,
    publishedAt:          p.created_at,
    createdAt:            p.created_at,
    created_at:           p.created_at,
    is_premium:           p.is_premium,
    username:             p.username,
    display_name:         p.display_name,
    avatar:               p.avatar,
    categories:           p.categories ?? [],
    tags:                 p.tags ?? [],
    author: {
      username:    p.username,
      displayName: p.display_name || p.username,
      avatarUrl:   p.avatar && p.avatar !== "true" && p.avatar !== "false"
                     ? p.avatar
                     : null,
    },
    category: p.categories?.[0]
      ? {
          id:          String(p.categories[0].id),
          name:        p.categories[0].name,
          slug:        p.categories[0].slug,
          description: null,
          icon:        null,
          color:       null,
          postCount:   0,
        }
      : null,
  };
}

function adaptCategory(c: Category) {
  return {
    id:          String(c.id),
    name:        c.name,
    slug:        c.slug,
    description: c.description ?? null,
    icon:        null,
    color:       c.color ?? null,
    postCount:   c.postCount ?? 0,
  };
}

/* ─── features (static) ──────────────────────────────────────────────────── */
const features = [
  {
    icon: PenSquare,
    title: "Write & Publish",
    description: "Create beautiful blog posts with our rich block-based editor. Support for code, images, and more.",
  },
  {
    icon: TrendingUp,
    title: "Grow Your Audience",
    description: "SEO-optimized content that ranks. Built-in analytics to track your growth.",
  },
  {
    icon: Users,
    title: "Build Community",
    description: "Engage with readers through comments and build a loyal following.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized for performance. Your content loads instantly on any device.",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function HomeClient({
  initialPosts,
  initialTrending,
  initialCategories,
}: {
  initialPosts:      Post[];
  initialTrending:   Post[];
  initialCategories: Category[];
}) {
  const { isAuthenticated } = useAuth();

  const posts         = initialPosts.map(adaptPost);
  const trendingPosts = initialTrending.map(adaptPost);
  const categories    = initialCategories.map(adaptCategory);

  return (
    <>
      <Header />
      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm text-violet-400 mb-6"
              >
                <Sparkles className="h-4 w-4" />
                <span>Modern Blogging Platform</span>
              </motion.div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
                <span className="text-white">Share Your </span>
                <span className="gradient-text">Stories</span>
                <span className="text-white"> with the World</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                A beautiful, SEO-optimized platform for developers and creators to write, publish, and grow their audience.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {isAuthenticated ? (
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 h-12 px-8"
                  >
                    <Link href="/dashboard/write">
                      <PenSquare className="h-5 w-5 mr-2" />
                      Start Writing
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 h-12 px-8"
                    >
                      <Link href="/register">Get Started Free</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="border-white/20 text-white hover:bg-white/10 h-12 px-8"
                    >
                      <Link href="/blog">Explore Articles</Link>
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
          </div>
        </section>

        {/* ── Trending ── */}
        {trendingPosts.length > 0 && (
          <section className="py-16 border-t border-white/5">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-violet-400" />
                  <h2 className="text-2xl font-bold text-white">Trending Now</h2>
                </div>
                <Button variant="ghost" asChild className="text-violet-400 hover:text-violet-300">
                  <Link href="/blog?sort=trending">
                    View all
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingPosts.slice(0, 3).map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <PostCard post={post} />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Features ── */}
        <section className="py-16 border-t border-white/5">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Everything You Need to Blog
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Built with modern technology to help you focus on what matters most: your content.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card rounded-xl p-6 text-center glass-hover"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Latest Posts ── */}
        {posts.length > 0 && (
          <section className="py-16 border-t border-white/5">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">Latest Articles</h2>
                <Button variant="ghost" asChild className="text-violet-400 hover:text-violet-300">
                  <Link href="/blog">
                    View all
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.slice(0, 6).map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <PostCard post={post} />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Categories ── */}
        {categories.length > 0 && (
          <section className="py-16 border-t border-white/5">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold text-white mb-8">Explore by Category</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {categories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/categories/${category.slug}`}
                      className="block glass-card rounded-xl p-5 text-center glass-hover"
                    >
                      <div
                        className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center"
                        style={{ backgroundColor: category.color ? `${category.color}20` : "#8b5cf620" }}
                      >
                        <span
                          className="text-lg font-bold"
                          style={{ color: category.color || "#8b5cf6" }}
                        >
                          {category.name.charAt(0)}
                        </span>
                      </div>
                      <h3 className="font-medium text-white mb-1">{category.name}</h3>
                      <p className="text-xs text-muted-foreground">{category.postCount} articles</p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CTA ── */}
        {!isAuthenticated && (
          <section className="py-20 border-t border-white/5">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-4xl mx-auto"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Start Your Blog?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                  Join thousands of writers and creators who trust BlogHub to share their stories with the world.
                </p>
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 h-12 px-8"
                >
                  <Link href="/register">Create Your Free Blog</Link>
                </Button>
              </motion.div>
            </div>
          </section>
        )}

      </main>
      <Footer />
    </>
  );
}