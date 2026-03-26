'use client';

/**
 * Blog Listing Page
 * Shows all published blog posts with pagination
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PostCard } from '@/components/blog/PostCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import type { PostListItem, Category, PaginatedResponse } from '@/types';
import api from '@/services/api';

const demoPosts: PostListItem[] = [
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

export default function BlogPage() {
  const [posts, setPosts] = useState<PostListItem[]>(demoPosts);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    total: 6,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, categoriesRes] = await Promise.all([
          api.posts.list({ page: currentPage, limit: 9, category: selectedCategory || undefined, search: searchQuery || undefined }),
          api.categories.getActive(),
        ]);

        if (postsRes.success && postsRes.data) {
          setPosts(postsRes.data.data);
          setPagination({
            totalPages: postsRes.data.pagination.totalPages,
            total: postsRes.data.pagination.total,
          });
        }
        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }
      } catch (error) {
        console.log('Using demo data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentPage, selectedCategory, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              All Articles
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Explore our collection of articles on technology, programming, design, and more.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-4 mb-8"
          >
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-violet-500"
                  />
                </div>
              </form>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-48 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select defaultValue="latest">
                <SelectTrigger className="w-full md:w-40 bg-white/5 border-white/10 text-white">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="discussed">Most Discussed</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <p className="text-muted-foreground text-lg">No articles found.</p>
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-12"
            >
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        onClick={() => setCurrentPage(i + 1)}
                        isActive={currentPage === i + 1}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                      className={currentPage === pagination.totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
