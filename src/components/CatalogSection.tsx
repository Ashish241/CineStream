import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';

interface CatalogSectionProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  isTvMode?: boolean;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  title,
  subtitle,
  items,
  onSelect,
  watchlist,
  onToggleWatchlist,
  isTvMode = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const distance = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="py-6 sm:py-8 space-y-3.5">
      {/* Section Header */}
      <div className="flex items-end justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
            {title}
          </h2>
          {subtitle && <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Scroll Nav Buttons */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="tv-focus p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="tv-focus p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Row */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-3 pt-1 scroll-smooth no-scrollbar"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="w-[140px] sm:w-[170px] md:w-[190px] lg:w-[210px] shrink-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            <MediaCard
              item={item}
              onSelect={onSelect}
              isWatchlisted={watchlist.includes(item.id)}
              onToggleWatchlist={onToggleWatchlist}
              isTvMode={isTvMode}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
