'use client';

/**
 * Categories Page
 * Display all blog categories
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import type { Category } from '@/types';
import api from '@/lib/axios';



export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const fetchCategories = async () => {
    try {

      const response = await api.get("/categories");

      if (response.data && response.data.length > 0) {
        setCategories(response.data);
      }

    } catch (error) {
      console.log("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  };

  fetchCategories();
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Categories
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Browse articles by topic. Find exactly what you're looking for.
            </p>
          </motion.div>

          {/* Categories Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="glass-card rounded-xl p-6 h-40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/categories/${category.slug}`}
                    className="block glass-card rounded-xl p-6 h-full glass-hover"
                  >
                    <div
                      className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center"
                      style={{ backgroundColor: category.color ? `${category.color}20` : '#8b5cf620' }}
                    >
                      <span
                        className="text-2xl font-bold"
                        style={{ color: category.color || '#8b5cf6' }}
                      >
                        {category.name.charAt(0)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                    )}
       <p className="text-xs text-muted-foreground">
  {category.postCount || 0} articles
</p>
                  </Link>
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
