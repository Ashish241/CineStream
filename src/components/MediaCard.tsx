import React, { useState } from 'react';
import { Play, Star, Plus, Check, Film } from 'lucide-react';
import { MediaItem } from '../types';

interface MediaCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  isWatchlisted?: boolean;
  onToggleWatchlist?: (item: MediaItem) => void;
  isTvMode?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onSelect,
  isWatchlisted = false,
  onToggleWatchlist,
  isTvMode = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const posterUrl = imageError || !item.poster ? '' : item.poster;

  return (
    <div
      tabIndex={0}
      role="button"
      data-tv-card="true"
      data-tv-nav="true"
      data-item-id={item.id}
      aria-label={`Play ${item.title}`}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className={`tv-focus group relative flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 cursor-pointer transition-all duration-200 select-none outline-none ${
        isTvMode
          ? 'hover:scale-[1.03] focus:scale-[1.05] focus:ring-4 focus:ring-amber-500 focus:border-amber-400 shadow-xl'
          : 'hover:scale-[1.02] focus:scale-[1.03] focus:ring-3 focus:ring-amber-500 focus:border-amber-400 hover:border-slate-700 shadow-md'
      }`}
    >
      {/* Poster Container with 2:3 Aspect Ratio */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.title}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-focus:scale-105"
          />
        ) : (
          /* Styled domain fallback for missing or broken images */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-slate-800 to-slate-950">
            <Film className="w-8 h-8 text-amber-400 mb-2" />
            <span className="text-xs font-semibold text-slate-300 line-clamp-2">{item.title}</span>
            <span className="text-[10px] text-slate-500 mt-1">{item.year || 'HD'}</span>
          </div>
        )}

        {/* Hover / TV Focus Play Overlay */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-xs gap-2">
          <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl transform group-hover:scale-110 group-focus:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-slate-950 translate-x-0.5" />
          </div>
          <span className="text-[11px] font-bold text-amber-300">Watch Now</span>
        </div>

        {/* Watchlist Quick Button */}
        {onToggleWatchlist && (
          <button
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(item);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 text-slate-300 hover:text-white hover:bg-slate-900 backdrop-blur-md border border-slate-700/50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity"
            title={isWatchlisted ? 'Remove from list' : 'Add to list'}
          >
            {isWatchlisted ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Card Info Section */}
      <div className="p-3 flex flex-col flex-1 justify-between bg-slate-900/95 group-focus:bg-slate-800 transition-colors">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-1 group-hover:text-amber-400 group-focus:text-amber-400 transition-colors">
            {item.title}
          </h3>

          {/* Clean unboxed metadata with · separator */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 font-medium truncate">
            <span className="text-amber-400/90 font-semibold">
              {item.type === 'movie' ? 'Movie' : 'Series'}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="tabular-nums">{item.year || '2025'}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            {item.rating ? (
              <span className="flex items-center gap-0.5 text-amber-300 tabular-nums">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span>{item.rating}</span>
              </span>
            ) : (
              <span className="text-slate-400">HD</span>
            )}
          </div>
        </div>

        {/* Stream Quality & Action Line */}
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span className="text-emerald-400 font-medium">1080p HD</span>
          <span className="text-slate-400 group-hover:text-amber-300 group-focus:text-amber-300 transition-colors flex items-center gap-0.5 font-semibold">
            Play <Play className="w-2.5 h-2.5 fill-current" />
          </span>
        </div>
      </div>
    </div>
  );
};
