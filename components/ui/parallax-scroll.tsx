"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import React, { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ParallaxScrollProps {
  images: {
    id: string;
    src: string;
    alt: string;
    title?: string;
  }[];
  className?: string;
  renderItem?: (item: { id: string; src: string; alt: string; title?: string }, index: number) => React.ReactNode;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export function ParallaxScroll({
  images,
  className,
  renderItem,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}: ParallaxScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Create parallax layers
  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);

  // Split images into two columns for parallax effect
  const firstColumn = images.filter((_, i) => i % 2 === 0);
  const secondColumn = images.filter((_, i) => i % 2 === 1);

  // Infinite scroll detection
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [onLoadMore, hasMore, isLoading]);

  const defaultRenderItem = (
    item: { id: string; src: string; alt: string; title?: string },
    index: number
  ) => (
    <motion.div
      key={item.id}
      className="group relative overflow-hidden rounded-xl bg-white/5"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        <img
          src={item.src}
          alt={item.alt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {item.title && (
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <h3 className="text-white font-medium text-sm truncate">{item.title}</h3>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full min-h-screen", className)}
    >
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First column - moves down on scroll */}
          <motion.div style={{ y: y1 }} className="space-y-4">
            {firstColumn.map((item, index) =>
              renderItem ? renderItem(item, index * 2) : defaultRenderItem(item, index)
            )}
          </motion.div>

          {/* Second column - moves up on scroll */}
          <motion.div style={{ y: y2 }} className="space-y-4 md:mt-20">
            {secondColumn.map((item, index) =>
              renderItem ? renderItem(item, index * 2 + 1) : defaultRenderItem(item, index)
            )}
          </motion.div>
        </div>

        {/* Load more trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-10">
            {isLoading && (
              <motion.div
                className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Grid version without parallax for better performance with many items
interface InfiniteGridProps {
  items: {
    id: string;
    src: string;
    alt: string;
    title?: string;
  }[];
  className?: string;
  renderItem?: (item: { id: string; src: string; alt: string; title?: string }, index: number) => React.ReactNode;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  columns?: number;
}

export function InfiniteGrid({
  items,
  className,
  renderItem,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  columns = 3,
}: InfiniteGridProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [onLoadMore, hasMore, isLoading]);

  const defaultRenderItem = (
    item: { id: string; src: string; alt: string; title?: string },
    index: number
  ) => (
    <motion.div
      key={item.id}
      className="group relative overflow-hidden rounded-xl bg-white/5"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.3 }}
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        <img
          src={item.src}
          alt={item.alt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {item.title && (
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <h3 className="text-white font-medium text-sm truncate">{item.title}</h3>
          </div>
        )}
      </div>
    </motion.div>
  );

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
  };

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("grid gap-4", gridCols[columns as keyof typeof gridCols] || gridCols[3])}>
        {items.map((item, index) =>
          renderItem ? renderItem(item, index) : defaultRenderItem(item, index)
        )}
      </div>

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-10">
          {isLoading && (
            <motion.div
              className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>
      )}
    </div>
  );
}