import api from "@/lib/axios";

export const postsApi = {

  // 🔥 MY POSTS
  getMyPosts: async (page = 1, limit = 10) => {
    const res = await api.get(`/posts/mine?page=${page}&limit=${limit}`);
    return res.data;
  },

  // 🔥 SINGLE POST
  getPostBySlug: async (slug: string) => {
    const res = await api.get(`/posts/${slug}`);
    return res.data;
  },

  // 🔥 CATEGORY POSTS
  getPostsByCategory: async (slug: string, page = 1) => {
    const res = await api.get(`/posts/category/${slug}?page=${page}`);
    return res.data;
  },

  // 🔥 TRENDING
  getTrending: async () => {
    const res = await api.get(`/posts/trending`);
    return res.data;
  },

};