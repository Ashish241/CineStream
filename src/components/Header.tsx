import React from 'react';
import {
  Search,
  Tv,
  SlidersHorizontal,
  X,
  MonitorPlay,
  HelpCircle,
  Mic,
  Download,
  Sparkles,
} from 'lucide-react';
import { OTT_PLATFORMS_LIST, OttPlatform } from '../data/ottPlatforms';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  selectedOtt: OttPlatform | null;
  onSelectOtt: (ott: OttPlatform | null) => void;
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
  selectedOtt,
  onSelectOtt,
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
    { id: 'serials', label: 'TV Shows' },
    { id: 'bollywood', label: 'Bollywood' },
    { id: 'anime', label: 'Anime' },
    { id: 'watchlist', label: `My List ${watchlistCount > 0 ? `(${watchlistCount})` : ''}` },
    { id: 'download', label: 'Get App' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 transition-all">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-10 2xl:px-14 h-15 sm:h-17 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Brand Wordmark + Laptop/TV Navigation Links */}
        <div className="flex items-center gap-3 lg:gap-5 xl:gap-6 shrink-0">
          <button
            onClick={() => {
              onSelectOtt(null);
              onSelectTab('all');
            }}
            data-tv-nav="true"
            className="tv-focus flex items-center gap-2 text-left group rounded-lg p-1"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
              <MonitorPlay className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-base sm:text-xl font-bold tracking-tight text-white flex items-center gap-1 sm:gap-1.5 font-display">
                <span>CineStream</span>
                <span className="text-amber-400 text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 font-mono uppercase tracking-wider font-semibold">
                  HD
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                All-in-One Multi-OTT Portal
              </p>
            </div>
          </button>

          {/* Zone 2: Laptop, Desktop & Smart TV Navigation Links (Visible on lg: 1024px+) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
            {navLinks.map((link) => {
              const active = !selectedOtt && currentTab === link.id;
              const isDownload = link.id === 'download';
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    onSelectOtt(null);
                    onSelectTab(link.id);
                  }}
                  data-tv-nav="true"
                  className={`tv-focus px-2.5 xl:px-3.5 py-2 text-xs xl:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    active
                      ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                      : isDownload
                      ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {isDownload && <Download className="w-3.5 h-3.5" />}
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Zone 3: Search, Voice & Device Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial justify-end min-w-0">
          {/* Live Search Bar */}
          <div className="relative flex-1 sm:flex-initial max-w-[175px] xs:max-w-[210px] sm:max-w-none">
            <div className="relative flex items-center w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 sm:left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search movies, shows..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                data-tv-nav="true"
                className="tv-focus w-full sm:w-44 md:w-56 xl:w-64 bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm rounded-xl pl-8 sm:pl-9 pr-7 py-1.5 sm:py-2 focus:border-amber-500 focus:bg-slate-800/90 transition-all placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  data-tv-nav="true"
                  className="absolute right-1.5 text-slate-400 hover:text-white p-1"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Voice Search Button */}
          <button
            onClick={onOpenVoiceSearch}
            data-tv-nav="true"
            className="tv-focus relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:from-amber-500/30 hover:to-yellow-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-400 transition-all shadow-sm group shrink-0"
            title="Voice Search (Hindi or English)"
          >
            <Mic className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          {/* Direct IMDb / TMDB manual input button */}
          <button
            onClick={onOpenDirectModal}
            data-tv-nav="true"
            className="tv-focus hidden xl:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all shrink-0"
            title="Custom IMDb / TMDB ID Input"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="whitespace-nowrap">Direct ID</span>
          </button>

          {/* TV Remote Helper button */}
          <button
            onClick={onOpenTvGuide}
            data-tv-nav="true"
            className="tv-focus hidden md:flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all shrink-0"
            title="TV Remote Keybindings Guide"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </button>

          {/* TV Mode Toggle Button */}
          <button
            onClick={onToggleTvMode}
            data-tv-nav="true"
            className={`tv-focus flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 ${
              isTvMode
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-amber-500/20'
                : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
            }`}
            title="Toggle Airtel Xstream / Smart TV Remote Mode"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline whitespace-nowrap">
              {isTvMode ? 'TV ON' : 'TV Mode'}
            </span>
          </button>
        </div>
      </div>

      {/* Net77 / NetMirror Style Instant Multi-OTT Platform Switcher Bar */}
      <div className="bg-slate-950/90 border-t border-slate-900/90">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-10 2xl:px-14 py-1.5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>OTT Switcher:</span>
            </span>

            {/* All Platforms / Home Button */}
            <button
              onClick={() => {
                onSelectOtt(null);
                onSelectTab('all');
              }}
              data-tv-nav="true"
              className={`tv-focus px-3 py-1 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap shrink-0 border ${
                !selectedOtt
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-800'
              }`}
            >
              All OTT Home
            </button>

            {/* 1-Click Direct OTT Platform Tabs (Netflix, Prime Video, JioHotstar, SonyLIV, ZEE5, Apple TV+) */}
            {OTT_PLATFORMS_LIST.map((ott) => {
              const isSelected = selectedOtt?.id === ott.id;
              return (
                <button
                  key={ott.id}
                  onClick={() => onSelectOtt(ott)}
                  data-tv-nav="true"
                  className={`tv-focus flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap shrink-0 border ${
                    isSelected
                      ? 'text-white shadow-md scale-[1.02]'
                      : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: ott.accentColor,
                          borderColor: ott.accentColor,
                          color: ott.id === 'appletv' ? '#000' : '#fff',
                        }
                      : undefined
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: isSelected
                        ? ott.id === 'appletv'
                          ? '#000'
                          : '#fff'
                        : ott.accentColor,
                    }}
                  />
                  <span>{ott.name}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile & Tablet Category Links on the right side of the strip */}
          <div className="lg:hidden flex items-center gap-1 shrink-0 pl-2 border-l border-slate-800">
            {navLinks
              .filter((l) => l.id !== 'all')
              .map((link) => {
                const active = !selectedOtt && currentTab === link.id;
                const isDownload = link.id === 'download';
                return (
                  <button
                    key={link.id}
                    onClick={() => {
                      onSelectOtt(null);
                      onSelectTab(link.id);
                    }}
                    data-tv-nav="true"
                    className={`tv-focus px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors flex items-center gap-1 ${
                      active
                        ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                        : isDownload
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/25'
                        : 'text-slate-400 hover:text-white bg-slate-900/60'
                    }`}
                  >
                    {isDownload && <Download className="w-3 h-3" />}
                    <span>{link.label}</span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </header>
  );
};
