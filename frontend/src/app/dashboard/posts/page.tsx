'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, Send, Eye, Search,
  BarChart2, FileText, Clock, CheckCircle,
  MoreVertical, Copy, ExternalLink, Archive,
  SortAsc, SortDesc, RefreshCw, X, AlertTriangle,
  TrendingUp, Layers,
} from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services';

/* ─── Types ─────────────────────────────────────────────── */
type Status = 'draft' | 'pending' | 'published' | 'archived';
type Filter = 'all' | Status;
type SortField = 'created_at' | 'views' | 'title';
type SortDir = 'asc' | 'desc';

type Post = {
  id: number;
  title: string;
  slug: string;
  status: Status;
  views: number;
  created_at: string;
  excerpt?: string;
  tags?: string[];
};

/* ─── Constants ──────────────────────────────────────────── */
const FILTERS: { value: Filter; label: string; icon: React.ReactNode }[] = [
  { value: 'all',       label: 'All',       icon: <Layers      className="h-3.5 w-3.5" /> },
  { value: 'draft',     label: 'Draft',     icon: <FileText    className="h-3.5 w-3.5" /> },
  { value: 'pending',   label: 'Pending',   icon: <Clock       className="h-3.5 w-3.5" /> },
  { value: 'published', label: 'Published', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  { value: 'archived',  label: 'Archived',  icon: <Archive     className="h-3.5 w-3.5" /> },
];

const STATUS_META: Record<Status, { color: string; bg: string; ring: string; dot: string }> = {
  draft:     { color: 'text-slate-400',  bg: 'bg-slate-500/10',  ring: 'ring-slate-500/20',  dot: 'bg-slate-400' },
  pending:   { color: 'text-amber-400',  bg: 'bg-amber-500/10',  ring: 'ring-amber-500/20',  dot: 'bg-amber-400' },
  published: { color: 'text-emerald-400',bg: 'bg-emerald-500/10',ring: 'ring-emerald-500/20',dot: 'bg-emerald-400' },
  archived:  { color: 'text-purple-400', bg: 'bg-purple-500/10', ring: 'ring-purple-500/20', dot: 'bg-purple-400' },
};

/* ─── Helpers ────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/* ─── Confirm Modal ──────────────────────────────────────── */
function ConfirmModal({
  title, message, onConfirm, onCancel, danger = false,
}: {
  title: string; message: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-[#13131a] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-red-500/15' : 'bg-violet-500/15'}`}>
          <AlertTriangle className={`h-6 w-6 ${danger ? 'text-red-400' : 'text-violet-400'}`} />
        </div>
        <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
        <p className="text-slate-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors
              ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-violet-600 hover:bg-violet-700'}`}>
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Toast ──────────────────────────────────────────────── */
type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium
              ${t.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : ''}
              ${t.type === 'error'   ? 'bg-red-500/15 border-red-500/30 text-red-300' : ''}
              ${t.type === 'info'    ? 'bg-violet-500/15 border-violet-500/30 text-violet-300' : ''}
            `}>
            <span>{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-60 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Context Menu ───────────────────────────────────────── */
function ContextMenu({
  post, onClose, onEdit, onSubmit, onDelete, onArchive, onCopyLink, onPreview,
}: {
  post: Post; onClose: () => void;
  onEdit: () => void; onSubmit: () => void; onDelete: () => void;
  onArchive: () => void; onCopyLink: () => void; onPreview: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    { icon: <Pencil className="h-4 w-4" />,      label: 'Edit Post',         action: onEdit },
    { icon: <ExternalLink className="h-4 w-4" />, label: 'Preview',           action: onPreview },
    { icon: <Copy className="h-4 w-4" />,         label: 'Copy Link',         action: onCopyLink },
    ...(post.status === 'draft' ? [{ icon: <Send className="h-4 w-4" />, label: 'Submit for Review', action: onSubmit }] : []),
    ...(post.status !== 'archived' ? [{ icon: <Archive className="h-4 w-4" />, label: 'Archive', action: onArchive }] : []),
    { icon: <Trash2 className="h-4 w-4" />,       label: 'Delete',            action: onDelete, danger: true },
  ];

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -4 }}
      className="absolute right-0 top-8 z-30 min-w-[180px] bg-[#1a1a27] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1"
    >
      {items.map((item, i) => (
        <button key={i} onClick={() => { item.action(); onClose(); }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
            ${item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:bg-white/5'}`}>
          {item.icon}
          {item.label}
        </button>
      ))}
    </motion.div>
  );
}

/* ─── Post Card ──────────────────────────────────────────── */
function PostCard({
  post, index, onSubmit, onDelete, onArchive, onCopyLink,
}: {
  post: Post; index: number;
  onSubmit: (p: Post) => void; onDelete: (p: Post) => void;
  onArchive: (p: Post) => void; onCopyLink: (p: Post) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const sm = STATUS_META[post.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/[0.14]
        rounded-2xl p-5 transition-all duration-200"
    >
      {/* accent line */}
      <div className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full ${sm.dot}`} />

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pl-3">

        {/* LEFT ── title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <Link href={`/blog/${post.slug}`}
              className="text-white font-semibold text-[15px] leading-snug hover:text-violet-300 transition-colors truncate max-w-[520px]">
              {post.title}
            </Link>
            {/* status badge */}
            <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ring-1 ${sm.bg} ${sm.color} ${sm.ring}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
              {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
            </span>
          </div>

          {post.excerpt && (
            <p className="text-slate-500 text-sm mt-1 line-clamp-1">{post.excerpt}</p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {fmtViews(post.views)} views
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {fmtDate(post.created_at)}
            </span>
            {post.tags?.slice(0, 2).map(t => (
              <span key={t} className="px-2 py-0.5 bg-white/5 rounded-md text-slate-400">#{t}</span>
            ))}
          </div>
        </div>

        {/* RIGHT ── quick actions */}
        <div className="flex items-center gap-2 shrink-0">

          {/* quick edit */}
          <Link href={`/dashboard/edit/${post.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>

          {/* submit for review */}
          {post.status === 'draft' && (
            <button onClick={() => onSubmit(post)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-xs font-medium transition-colors">
              <Send className="h-3.5 w-3.5" /> Submit
            </button>
          )}

          {/* more menu */}
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <ContextMenu
                  post={post}
                  onClose={() => setMenuOpen(false)}
                  onEdit={() => router.push(`/dashboard/edit/${post.id}`)}
                  onSubmit={() => onSubmit(post)}
                  onDelete={() => onDelete(post)}
                  onArchive={() => onArchive(post)}
                  onCopyLink={() => onCopyLink(post)}
                  onPreview={() => window.open(`/blog/${post.slug}`, '_blank')}
                />
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-[88px] rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
      ))}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function ManagePostsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [posts,   setPosts]   = useState<Post[]>([]);
  const [filter,  setFilter]  = useState<Filter>('all');
  const [search,  setSearch]  = useState('');
  const [sort,    setSort]    = useState<{ field: SortField; dir: SortDir }>({ field: 'created_at', dir: 'desc' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts,  setToasts]  = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; onConfirm: () => void; danger?: boolean }>(null);
  const toastId = useRef(0);

  /* auth */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading]);

  /* fetch */
  const fetchPosts = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await api.posts.getMyPosts(1, 100);
      if (res.success) setPosts(res.data);
    } catch {
      toast('Failed to fetch posts', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  /* toast helper */
  const toast = (message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  /* derived data */
  const byStatus = (s: Status) => posts.filter(p => p.status === s).length;

  const visible = posts
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const { field, dir } = sort;
      const mul = dir === 'asc' ? 1 : -1;
      if (field === 'views')      return mul * (a.views - b.views);
      if (field === 'title')      return mul * a.title.localeCompare(b.title);
      return mul * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

  /* actions */
  const submitForReview = async (post: Post) => {
    try {
      await api.patch(`/posts/${post.id}`, { status: 'pending' });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'pending' } : p));
      toast('Submitted for review ✓', 'success');
    } catch { toast('Failed to submit', 'error'); }
  };

  const archivePost = async (post: Post) => {
    try {
      await api.patch(`/posts/${post.id}`, { status: 'archived' });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'archived' } : p));
      toast('Post archived', 'info');
    } catch { toast('Failed to archive', 'error'); }
  };

  const deletePost = (post: Post) => {
    setConfirm({
      title: 'Delete Post',
      message: `"${post.title}" will be permanently deleted.`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/posts/${post.id}`);
          setPosts(prev => prev.filter(p => p.id !== post.id));
          toast('Post deleted', 'success');
        } catch { toast('Failed to delete', 'error'); }
        setConfirm(null);
      },
    });
  };

  const copyLink = async (post: Post) => {
    const url = `${window.location.origin}/blog/${post.slug}`;
    await navigator.clipboard.writeText(url);
    toast('Link copied!', 'success');
  };

  const toggleSort = (field: SortField) => {
    setSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <>
      <Header />

      {/* Toasts */}
      <ToastStack toasts={toasts} onDismiss={id => setToasts(p => p.filter(t => t.id !== id))} />

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      </AnimatePresence>

      <main className="flex-1 min-h-screen bg-[#0d0d14] py-10">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* ── PAGE HEADER ── */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-1">Dashboard</p>
                <h1 className="text-3xl font-bold text-white tracking-tight">My Posts</h1>
              </div>

              <div className="flex items-center gap-3">
                {/* Refresh */}
                <button onClick={() => fetchPosts(true)} disabled={refreshing}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-50">
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>

                {/* New Post */}
                <Link href="/dashboard/write"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500
                    text-white text-sm font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40
                    hover:scale-[1.02] transition-all duration-150">
                  <Plus className="h-4 w-4" />
                  New Post
                </Link>
              </div>
            </div>

            {/* ── STATS STRIP ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {[
                { label: 'Total',     value: posts.length,           icon: <Layers className="h-4 w-4" />,      color: 'text-white' },
                { label: 'Published', value: byStatus('published'),   icon: <TrendingUp className="h-4 w-4" />,  color: 'text-emerald-400' },
                { label: 'Pending',   value: byStatus('pending'),     icon: <Clock className="h-4 w-4" />,       color: 'text-amber-400' },
                { label: 'Drafts',    value: byStatus('draft'),       icon: <FileText className="h-4 w-4" />,    color: 'text-slate-400' },
              ].map(s => (
                <div key={s.label}
                  className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-3">
                  <span className={`${s.color} opacity-60`}>{s.icon}</span>
                  <div>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CONTROLS ── */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search posts…"
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl
                  text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50
                  focus:bg-white/[0.06] transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              {([
                { field: 'created_at' as SortField, label: 'Date' },
                { field: 'views'      as SortField, label: 'Views' },
                { field: 'title'      as SortField, label: 'A–Z' },
              ]).map(s => (
                <button key={s.field} onClick={() => toggleSort(s.field)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors
                    ${sort.field === s.field
                      ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30'
                      : 'bg-white/[0.04] text-slate-400 border border-white/[0.07] hover:bg-white/[0.08]'
                    }`}>
                  {s.label}
                  {sort.field === s.field && (
                    sort.dir === 'desc'
                      ? <SortDesc className="h-3 w-3" />
                      : <SortAsc  className="h-3 w-3" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── FILTER TABS ── */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {FILTERS.map(f => {
              const count = f.value === 'all'
                ? posts.length
                : posts.filter(p => p.status === f.value).length;
              return (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all
                    ${filter === f.value
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                      : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white'
                    }`}>
                  {f.icon}
                  {f.label}
                  <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-md
                    ${filter === f.value ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── POST LIST ── */}
          {loading ? (
            <Skeleton />
          ) : visible.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-slate-600" />
              </div>
              <p className="text-slate-400 font-medium">
                {search ? `No posts matching "${search}"` : 'No posts yet'}
              </p>
              <p className="text-slate-600 text-sm mt-1">
                {search ? 'Try a different search term' : 'Create your first post to get started'}
              </p>
              {!search && (
                <Link href="/dashboard/write"
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
                  <Plus className="h-4 w-4" /> Write a Post
                </Link>
              )}
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {visible.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    index={i}
                    onSubmit={submitForReview}
                    onDelete={deletePost}
                    onArchive={archivePost}
                    onCopyLink={copyLink}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* ── FOOTER META ── */}
          {!loading && visible.length > 0 && (
            <p className="mt-6 text-center text-xs text-slate-600">
              Showing {visible.length} of {posts.length} posts
            </p>
          )}

        </div>
      </main>

      <Footer />
    </>
  );
}