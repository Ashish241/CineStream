import React from 'react';
import {
  Search,
  Tv,
  SlidersHorizontal,
  X,
  MonitorPlay,
  HelpCircle,
  Mic,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenDirectModal: () => void;
  onOpenTvGuide: () => void;
  onOpenVoiceSearch: () => void;
  isTvMode: boolean;
  onToggleTvMode: () => void;
  watchlistCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  onOpenDirectModal,
  onOpenTvGuide,
  onOpenVoiceSearch,
  isTvMode,
  onToggleTvMode,
  watchlistCount,
}) => {
  const navLinks = [
    { id: 'all', label: 'Home' },
    { id: 'movies', label: 'Movies' },
    { id: 'series', label: 'Web Series' },
    { id: 'bollywood', label: 'Hindi / Bollywood' },
    { id: 'anime', label: 'Anime' },
    { id: 'watchlist', label: `My List ${watchlistCount > 0 ? `(${watchlistCount})` : ''}` },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-6 shrink-0">
          <button
            onClick={() => onSelectTab('all')}
            data-tv-nav="true"
            className="tv-focus flex items-center gap-2.5 text-left group rounded-lg p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <MonitorPlay className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-display">
                CineStream{' '}
                <span className="text-amber-400 text-xs px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 font-mono uppercase tracking-wider font-semibold">
                  TV
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">1080p Smart TV Streamer</p>
            </div>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onSelectTab(link.id)}
                  data-tv-nav="true"
                  className={`tv-focus px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Zone 3: Search, Voice & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Live Search Bar */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search movies, web series..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                data-tv-nav="true"
                className="tv-focus w-36 sm:w-56 md:w-64 bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm rounded-xl pl-9 pr-8 py-2 focus:border-amber-500 focus:bg-slate-800/90 transition-all placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  data-tv-nav="true"
                  className="absolute right-2.5 text-slate-400 hover:text-white p-1"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Voice Search Button with Animated Wave Accent */}
          <button
            onClick={onOpenVoiceSearch}
            data-tv-nav="true"
            className="tv-focus relative flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:from-amber-500/30 hover:to-yellow-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-400 transition-all shadow-sm group"
            title="Voice Search (Press V on TV remote / Speak movie title)"
          >
            <Mic className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          {/* Direct IMDb / TMDB manual input button */}
          <button
            onClick={onOpenDirectModal}
            data-tv-nav="true"
            className="tv-focus hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all"
            title="Custom IMDb / TMDB ID Input"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="whitespace-nowrap">Direct ID</span>
          </button>

          {/* TV Remote Helper button */}
          <button
            onClick={onOpenTvGuide}
            data-tv-nav="true"
            className="tv-focus hidden md:flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
            title="TV Remote Keybindings Guide"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </button>

          {/* TV Mode Toggle Button */}
          <button
            onClick={onToggleTvMode}
            data-tv-nav="true"
            className={`tv-focus flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
              isTvMode
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-amber-500/20'
                : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
            }`}
            title="Toggle Smart TV Remote Mode"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{isTvMode ? 'TV Mode ON' : 'TV Mode'}</span>
          </button>
        </div>
      </div>

      {/* Mobile / Small screen navigation bar */}
      <div className="lg:hidden px-4 py-2 bg-slate-950 border-t border-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {navLinks.map((link) => {
          const active = currentTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => onSelectTab(link.id)}
              data-tv-nav="true"
              className={`tv-focus px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                active ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          );
        })}
        <button
          onClick={onOpenDirectModal}
          data-tv-nav="true"
          className="tv-focus px-3 py-1.5 text-xs font-medium rounded-lg text-amber-300 bg-amber-500/10 whitespace-nowrap shrink-0 sm:hidden flex items-center gap-1"
        >
          <SlidersHorizontal className="w-3 h-3" />
          Direct ID
        </button>
      </div>
    </header>
  );
};
