'use client';

/**
 * Content Renderer Component
 * Renders block-based content for blog posts
 */

import Image from 'next/image';
import { motion } from 'framer-motion';
import type { ContentBlock } from '@/types';

interface ContentRendererProps {
  content: ContentBlock[];
  className?: string;
}

export function ContentRenderer({ content, className = '' }: ContentRendererProps) {
  if (!content || !Array.isArray(content) || content.length === 0) {
    return (
      <p className="text-muted-foreground italic">No content available.</p>
    );
  }

  return (
    <div className={`prose-custom max-w-none ${className}`}>
      {content.map((block, index) => (
        <ContentBlock key={index} block={block} index={index} />
      ))}
    </div>
  );
}

function ContentBlock({ block, index }: { block: ContentBlock; index: number }) {
  const animationDelay = index * 0.05;

  switch (block.type) {
    case 'paragraph':
      return (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animationDelay }}
          className="mb-6 text-lg leading-relaxed text-muted-foreground"
        >
          {block.content}
        </motion.p>
      );

    case 'heading':
      const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements;
      const headingClasses = {
        1: 'text-4xl font-bold mb-6 mt-12',
        2: 'text-3xl font-bold mb-4 mt-10',
        3: 'text-2xl font-semibold mb-3 mt-8',
        4: 'text-xl font-semibold mb-2 mt-6',
      };
      return (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: animationDelay }}
        >
          <HeadingTag className={`${headingClasses[block.level]} text-white`}>
            {block.content}
          </HeadingTag>
        </motion.div>
      );

    case 'image':
      return (
        <motion.figure
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: animationDelay }}
          className="my-8"
        >
          <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
            <Image
              src={block.url}
              alt={block.alt || 'Blog image'}
              fill
              className="object-cover"
            />
          </div>
          {(block.caption || block.alt) && (
            <figcaption className="mt-3 text-center text-sm text-muted-foreground">
              {block.caption || block.alt}
            </figcaption>
          )}
        </motion.figure>
      );

    case 'code':
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animationDelay }}
          className="my-6 relative group"
        >
          <div className="absolute top-3 right-3 z-10">
            <span className="text-xs text-muted-foreground bg-black/50 px-2 py-1 rounded">
              {block.language}
            </span>
          </div>
          <pre className="p-4 rounded-xl bg-black/40 border border-white/10 overflow-x-auto">
            <code className="text-sm font-mono text-emerald-400">
              {block.content}
            </code>
          </pre>
        </motion.div>
      );

    case 'quote':
      return (
        <motion.blockquote
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: animationDelay }}
          className="my-8 pl-6 border-l-4 border-violet-500 italic"
        >
          <p className="text-xl text-white/90 mb-2">"{block.content}"</p>
          {block.author && (
            <cite className="text-sm text-violet-400 not-italic">
              — {block.author}
            </cite>
          )}
        </motion.blockquote>
      );

    case 'list':
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animationDelay }}
          className="my-6"
        >
          <ListTag
            className={`space-y-2 ${
              block.ordered
                ? 'list-decimal pl-6'
                : 'list-disc pl-6'
            } text-muted-foreground`}
          >
            {block.items.map((item, i) => (
              <li key={i} className="text-lg">
                {item}
              </li>
            ))}
          </ListTag>
        </motion.div>
      );

    case 'divider':
      return (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: animationDelay }}
          className="my-10 flex items-center gap-4"
        >
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </motion.div>
      );

    case 'embed':
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animationDelay }}
          className="my-8"
        >
          {block.provider === 'youtube' && (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
              <iframe
                src={block.url.replace('watch?v=', 'embed/')}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {block.provider === 'twitter' && (
            <div className="flex justify-center">
              <blockquote className="twitter-tweet">
                <a href={block.url}></a>
              </blockquote>
            </div>
          )}
          {block.provider === 'codepen' && (
            <iframe
              src={block.url}
              className="w-full h-[400px] rounded-xl border border-white/10"
              title="CodePen Embed"
            />
          )}
        </motion.div>
      );

    default:
      return null;
  }
}

export default ContentRenderer;
