'use client';

/**
 * Trending Page
 * Display trending blog posts
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Flame } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PostCard } from '@/components/blog/PostCard';
import type { PostListItem } from '@/types';
import api from '@/services/api';

const demoTrendingPosts: PostListItem[] = [
  {
    id: '1',
    title: 'Getting Started with Next.js 14: A Complete Guide',
    slug: 'getting-started-nextjs-14',
    excerpt: 'Learn how to build modern web applications with Next.js 14, featuring the new App Router, Server Components, and more.',
    featuredImageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
    viewCount: 1542,
    likeCount: 89,
    commentCount: 23,
    readingTimeMinutes: 8,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    author: { username: 'johndoe', displayName: 'John Doe', avatarUrl: null },
    category: { id: '1', name: 'Programming', slug: 'programming', description: null, icon: null, color: null, postCount: 0 },
  },
  {
    id: '2',
    title: 'The Art of Clean Code: Best Practices for Developers',
    slug: 'art-of-clean-code',
    excerpt: 'Discover the principles of writing clean, maintainable code that your future self will thank you for.',
    featuredImageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
    viewCount: 892,
    likeCount: 67,
    commentCount: 15,
    readingTimeMinutes: 6,
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    author: { username: 'janesmith', displayName: 'Jane Smith', avatarUrl: null },
    category: { id: '2', name: 'Technology', slug: 'technology', description: null, icon: null, color: null, postCount: 0 },
  },
  {
    id: '3',
    title: 'Building Scalable APIs with Node.js and TypeScript',
    slug: 'building-scalable-apis',
    excerpt: 'A comprehensive guide to building production-ready APIs using Node.js, Express, and TypeScript.',
    featuredImageUrl: 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800',
    viewCount: 654,
    likeCount: 45,
    commentCount: 8,
    readingTimeMinutes: 12,
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    author: { username: 'mikejones', displayName: 'Mike Jones', avatarUrl: null },
    category: { id: '1', name: 'Programming', slug: 'programming', description: null, icon: null, color: null, postCount: 0 },
  },
  {
    id: '4',
    title: 'Mastering CSS Grid: Modern Layout Techniques',
    slug: 'mastering-css-grid',
    excerpt: 'Unlock the power of CSS Grid to create complex, responsive layouts with ease.',
    featuredImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    viewCount: 423,
    likeCount: 34,
    commentCount: 6,
    readingTimeMinutes: 7,
    publishedAt: new Date(Date.now() - 259200000).toISOString(),
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    author: { username: 'sarahwilson', displayName: 'Sarah Wilson', avatarUrl: null },
    category: { id: '3', name: 'Design', slug: 'design', description: null, icon: null, color: null, postCount: 0 },
  },
  {
    id: '5',
    title: 'Understanding React Server Components',
    slug: 'react-server-components',
    excerpt: 'Deep dive into React Server Components and how they change the way we build React applications.',
    featuredImageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
    viewCount: 1156,
    likeCount: 78,
    commentCount: 19,
    readingTimeMinutes: 10,
    publishedAt: new Date(Date.now() - 345600000).toISOString(),
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    author: { username: 'alexturner', displayName: 'Alex Turner', avatarUrl: null },
    category: { id: '1', name: 'Programming', slug: 'programming', description: null, icon: null, color: null, postCount: 0 },
  },
  {
    id: '6',
    title: 'The Future of Web Development in 2024',
    slug: 'future-web-development-2024',
    excerpt: 'Exploring emerging trends and technologies that will shape web development in the coming year.',
    featuredImageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
    viewCount: 2345,
    likeCount: 156,
    commentCount: 42,
    readingTimeMinutes: 9,
    publishedAt: new Date(Date.now() - 432000000).toISOString(),
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    author: { username: 'emilybrown', displayName: 'Emily Brown', avatarUrl: null },
    category: { id: '2', name: 'Technology', slug: 'technology', description: null, icon: null, color: null, postCount: 0 },
  },
];

export default function TrendingPage() {
  const [posts, setPosts] = useState<PostListItem[]>(demoTrendingPosts);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await api.posts.trending(20);
        if (response.success && response.data && response.data.length > 0) {
          setPosts(response.data);
        }
      } catch (error) {
        console.log('Using demo data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();
  }, []);

  return (
    <>
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Trending
              </h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              The hottest articles right now. See what everyone's reading.
            </p>
          </motion.div>

          {/* Trending Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-4 mb-8 flex items-center gap-3"
          >
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <span className="text-sm text-muted-foreground">
              Trending scores are calculated based on views and recency (last 30 days)
            </span>
          </motion.div>

          {/* Posts Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card rounded-xl h-80 animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No trending posts found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
