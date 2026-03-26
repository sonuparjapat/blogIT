'use client';

/**
 * User Dashboard Page
 * Main dashboard for authenticated users
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PenSquare, FileText, Eye, Heart, MessageCircle, TrendingUp, Plus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { PostListItem } from '@/types';
import { api } from '@/services';


// Demo stats
const demoStats = {
  totalPosts: 12,
  publishedPosts: 8,
  totalViews: 4523,
  totalLikes: 234,
  totalComments: 67,
};

// Demo posts
const demoPosts: PostListItem[] = [
  {
    id: '1',
    title: 'Getting Started with Next.js 14',
    slug: 'getting-started-nextjs-14',
    excerpt: 'A complete guide to building modern web apps.',
    featuredImageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200',
    viewCount: 1542,
    likeCount: 89,
    commentCount: 23,
    readingTimeMinutes: 8,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    author: { username: 'johndoe', displayName: 'John Doe', avatarUrl: null },
    category: { id: '1', name: 'Programming', slug: 'programming', description: null, icon: null, color: null, postCount: 0 },
  },
];

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(demoStats);
  const [recentPosts, setRecentPosts] = useState<PostListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;
      
      try {
        const response = await api.posts.getMyPosts(1, 10);

if (response.success) {
  console.log(response,"response")
  const posts = response.data;

  setRecentPosts(posts.slice(0, 5));

  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p:any) => p.status === "published").length;
  const totalViews = posts.reduce((acc:any, p:any) => acc + (p.views || 0), 0);

  setStats({
    totalPosts,
    publishedPosts,
    totalViews,
    totalLikes: 0,
    totalComments: 0,
  });
}
      } catch (error) {
        console.log('Using demo data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  if (authLoading || !isAuthenticated) {
    return (
      <>
        <Header />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4">
            <div className="animate-pulse">
              <div className="h-8 bg-white/10 rounded w-1/4 mb-8" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-white/10 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.displayName || user?.username}!
            </h1>
            <p className="text-muted-foreground">
              Here's an overview of your blog activity
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground text-sm">Total Posts</span>
                <FileText className="h-5 w-5 text-violet-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalPosts}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.publishedPosts} published
              </p>
            </div>

            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground text-sm">Total Views</span>
                <Eye className="h-5 w-5 text-cyan-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {stats.totalViews.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12% this week
              </p>
            </div>

            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground text-sm">Total Likes</span>
                <Heart className="h-5 w-5 text-pink-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalLikes}</p>
            </div>

            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground text-sm">Comments</span>
                <MessageCircle className="h-5 w-5 text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalComments}</p>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-4 mb-8"
          >
            <Button asChild className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white">
              <Link href="/dashboard/write">
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Link>
            </Button>
            <Button variant="outline" asChild className="border-white/10 text-white">
              <Link href="/dashboard/posts">
                <FileText className="h-4 w-4 mr-2" />
                Manage Posts
              </Link>
            </Button>
          </motion.div>

          {/* Recent Posts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Recent Posts</h2>
              <Button variant="ghost" asChild className="text-violet-400 hover:text-violet-300">
                <Link href="/dashboard/posts">View all</Link>
              </Button>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-sm font-medium text-muted-foreground p-4">Title</th>
                      <th className="text-left text-sm font-medium text-muted-foreground p-4">Status</th>
                      <th className="text-left text-sm font-medium text-muted-foreground p-4">Views</th>
                      <th className="text-left text-sm font-medium text-muted-foreground p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPosts.map((post) => (
                      <tr key={post.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-4">
                          <Link href={`/blog/${post.slug}`} className="text-white hover:text-violet-400 font-medium">
                            {post.title}
                          </Link>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                            Published
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {post.views}
                        </td>
                        <td className="p-4 text-muted-foreground text-sm">
                          {new Date(post.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
