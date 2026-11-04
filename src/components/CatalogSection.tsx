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
    const distance = scrollRef.current.clientWidth * 0.78;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="py-4 sm:py-6 lg:py-7 space-y-3 sm:space-y-4">
      {/* Section Header */}
      <div className="flex items-end justify-between px-4 sm:px-6 lg:px-10 2xl:px-14">
        <div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-white font-display">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 line-clamp-1">{subtitle}</p>
          )}
        </div>

        {/* Scroll Nav Buttons (Tablet, Laptop, Desktop & TV) */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
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

      {/* Horizontal Scroll Row Optimized for Mobile, Tablet, Laptop & TV */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3 sm:gap-4 lg:gap-5 overflow-x-auto px-4 sm:px-6 lg:px-10 2xl:px-14 pb-3 pt-1 scroll-smooth no-scrollbar"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="w-[140px] sm:w-[168px] md:w-[188px] lg:w-[210px] xl:w-[225px] 2xl:w-[245px] shrink-0"
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
