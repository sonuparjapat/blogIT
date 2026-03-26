/**
 * Frontend Types
 */

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'banned' | 'suspended';
  createdAt: string;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

// Post types
export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: ContentBlock[];
  featuredImageUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  readingTimeMinutes: number;
  publishedAt: string | null;
  createdAt: string;
  author: Author;
  category: Category | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
}

export interface PostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  readingTimeMinutes: number;
  publishedAt: string | null;
  createdAt: string;
  author: Author;
  category: Category | null;
}

export interface Author {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  postCount: number;
}

// Content block types for block-based editor
export type ContentBlock = 
  | { type: 'paragraph'; content: string }
  | { type: 'heading'; level: 1 | 2 | 3 | 4; content: string }
  | { type: 'image'; url: string; alt?: string; caption?: string }
  | { type: 'code'; language: string; content: string }
  | { type: 'quote'; content: string; author?: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'divider' }
  | { type: 'embed'; provider: 'youtube' | 'twitter' | 'codepen'; url: string };

export interface CreatePostInput {
  title: string;
  slug: string;
  excerpt?: string;
  content: ContentBlock[];
  categoryId?: string;
  featuredImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  status?: 'draft' | 'published';
}

export type UpdatePostInput = Partial<CreatePostInput>;

// Comment types
export interface Comment {
  id: string;
  postId: string;
  content: string;
  likeCount: number;
  createdAt: string;
  author: Author;
  replies?: Comment[];
}

export interface CreateCommentInput {
  content: string;
  parentId?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Admin types
export interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  publishedPosts: number;
  draftPosts: number;
  newUsersThisMonth: number;
  newPostsThisMonth: number;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: string;
  status: string;
  createdAt: string;
  postCount: number;
}

export interface AdminPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  author: {
    username: string;
    displayName: string | null;
  };
  category: string | null;
}
