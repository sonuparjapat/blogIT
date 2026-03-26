'use client';

/**
 * Google AdSense Component
 * Lazy-loaded ad placement for monetization
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface AdSenseProps {
  adSlot: string;
  adFormat?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
  style?: React.CSSProperties;
}

export function AdSense({ 
  adSlot, 
  adFormat = 'auto', 
  className = '',
  style = {}
}: AdSenseProps) {
  const adRef = useRef<HTMLModElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if AdSense script is loaded
    const checkAdSense = () => {
      const isAdSenseLoaded = typeof window !== 'undefined' && (window as any).adsbygoogle;
      
      if (!isAdSenseLoaded) {
        // Load AdSense script
        const script = document.createElement('script');
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.dataset.adClient = 'ca-pub-XXXXXXXXXXXXXXXX';
        document.head.appendChild(script);
      }
    };

    checkAdSense();

    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            try {
              ((window as any).adsbygoogle || []).push({});
            } catch (error) {
              // AdSense not loaded yet, ignore
            }
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Placeholder for development/when ads are not loaded
  if (!isVisible) {
    return (
      <div className={`relative overflow-hidden rounded-xl glass-card ${className}`} style={style}>
        <div className="flex items-center justify-center h-24 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
          <span className="text-xs text-muted-foreground">Advertisement</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`ad-container ${className}`}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-format={adFormat}
        data-ad-slot={adSlot}
        data-full-width-responsive="true"
      />
    </motion.div>
  );
}

// In-article ad placement
export function InArticleAd({ adSlot }: { adSlot: string }) {
  return (
    <div className="my-8">
      <AdSense
        adSlot={adSlot}
        adFormat="horizontal"
        className="w-full"
        style={{ minHeight: '90px' }}
      />
    </div>
  );
}

// Sidebar ad placement
export function SidebarAd({ adSlot }: { adSlot: string }) {
  return (
    <div className="sticky top-24">
      <AdSense
        adSlot={adSlot}
        adFormat="vertical"
        className="w-full"
        style={{ minHeight: '250px' }}
      />
    </div>
  );
}

// Banner ad placement
export function BannerAd({ adSlot }: { adSlot: string }) {
  return (
    <div className="w-full max-w-4xl mx-auto my-8">
      <AdSense
        adSlot={adSlot}
        adFormat="horizontal"
        className="w-full"
        style={{ minHeight: '90px' }}
      />
    </div>
  );
}

export default AdSense;
