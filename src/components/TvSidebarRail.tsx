import React, { useState } from 'react';
import {
  Home,
  Search,
  Mic,
  Film,
  Tv,
  MonitorPlay,
  Sparkles,
  Flame,
  Bookmark,
  Download,
  Maximize2,
  Minimize2,
  HelpCircle,
  Power,
} from 'lucide-react';
import { OTT_PLATFORMS_LIST, OttPlatform } from '../data/ottPlatforms';

interface TvSidebarRailProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  selectedOtt: OttPlatform | null;
  onSelectOtt: (ott: OttPlatform | null) => void;
  onOpenVoiceSearch: () => void;
  onFocusSearchInput: () => void;
  onOpenTvGuide: () => void;
  onExitTvMode: () => void;
  watchlistCount: number;
}

export const TvSidebarRail: React.FC<TvSidebarRailProps> = ({
  currentTab,
  onSelectTab,
  selectedOtt,
  onSelectOtt,
  onOpenVoiceSearch,
  onFocusSearchInput,
  onOpenTvGuide,
  onExitTvMode,
  watchlistCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    typeof document !== 'undefined' && Boolean(document.fullscreenElement)
  );

  const toggleKioskFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const mainNavItems = [
    { id: 'all', label: 'Home', icon: Home },
    { id: 'movies', label: 'Movies', icon: Film },
    { id: 'series', label: 'Web Series', icon: Tv },
    { id: 'serials', label: 'TV Serials', icon: MonitorPlay },
    { id: 'bollywood', label: 'Bollywood', icon: Sparkles },
    { id: 'anime', label: 'Anime', icon: Flame },
    {
      id: 'watchlist',
      label: watchlistCount > 0 ? `My List (${watchlistCount})` : 'My List',
      icon: Bookmark,
    },
    { id: 'download', label: 'TV Home Icon / APK', icon: Download },
  ];

  return (
    <aside
      aria-label="Smart TV Navigation Rail"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onFocusCapture={() => setIsExpanded(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsExpanded(false);
        }
      }}
      className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col justify-between py-4 transition-all duration-300 ease-out select-none ${
        isExpanded
          ? 'w-64 bg-slate-950/98 border-r border-amber-500/30 shadow-[20px_0_60px_rgba(0,0,0,0.9)] px-3'
          : 'w-16 sm:w-20 bg-slate-950/90 border-r border-slate-900/90 px-2'
      } backdrop-blur-xl overflow-y-auto no-scrollbar`}
    >
      {/* Top Brand Logo & Voice / Search Quick Actions */}
      <div className="space-y-3">
        <button
          onClick={() => {
            onSelectOtt(null);
            onSelectTab('all');
          }}
          data-tv-nav="true"
          className="tv-focus w-full flex items-center gap-3 p-2 rounded-2xl text-left group"
          title="CineStream Smart TV Home"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/25 shrink-0">
            <MonitorPlay className="w-6 h-6 stroke-[2.3]" />
          </div>
          {isExpanded && (
            <div className="min-w-0 animate-in fade-in duration-150">
              <div className="text-base font-extrabold text-white font-display flex items-center gap-1.5">
                <span>CineStream</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                  TV
                </span>
              </div>
              <div className="text-[10px] text-amber-400 font-semibold truncate">
                Airtel Xstream · Android TV
              </div>
            </div>
          )}
        </button>

        {/* Quick Voice Search & Keyboard Search (Netflix / Prime TV Style) */}
        <div className="space-y-1 pt-1 border-b border-slate-800/80 pb-2.5">
          <button
            onClick={onOpenVoiceSearch}
            data-tv-nav="true"
            className="tv-focus w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all"
            title="Voice Search with Airtel Remote Mic"
          >
            <Mic className="w-5 h-5 text-amber-400 shrink-0" />
            {isExpanded && (
              <span className="text-xs font-extrabold whitespace-nowrap">
                Voice Search (बोलकर खोजें)
              </span>
            )}
          </button>

          <button
            onClick={onFocusSearchInput}
            data-tv-nav="true"
            className="tv-focus w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-all"
            title="Search Movies, Web Series & Serials"
          >
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            {isExpanded && (
              <span className="text-xs font-bold whitespace-nowrap">Search Catalog</span>
            )}
          </button>
        </div>

        {/* Main Categories (Netflix / Prime Video Left Rail) */}
        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = !selectedOtt && currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectOtt(null);
                  onSelectTab(item.id);
                }}
                data-tv-nav="true"
                className={`tv-focus w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-lg shadow-amber-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/90 font-semibold'
                }`}
                title={item.label}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    active ? 'text-slate-950 stroke-[2.4]' : 'text-slate-400'
                  }`}
                />
                {isExpanded && (
                  <span className="text-xs whitespace-nowrap truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Direct OTT Hubs Section inside the Left TV Rail */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1">
          {isExpanded && (
            <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              OTT Apps Hub
            </div>
          )}
          {OTT_PLATFORMS_LIST.map((ott) => {
            const active = selectedOtt?.id === ott.id;
            return (
              <button
                key={ott.id}
                onClick={() => onSelectOtt(ott)}
                data-tv-nav="true"
                className={`tv-focus w-full flex items-center gap-3.5 px-3 py-2 rounded-xl transition-all ${
                  active
                    ? 'bg-slate-800 text-white font-extrabold border border-amber-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80 font-semibold'
                }`}
                title={ott.name}
              >
                <span
                  className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm"
                  style={{
                    backgroundColor: ott.accentColor,
                    color: ott.id === 'appletv' ? '#000' : '#fff',
                  }}
                >
                  {ott.name.slice(0, 1)}
                </span>
                {isExpanded && (
                  <span className="text-xs whitespace-nowrap truncate">{ott.name}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom TV Controls: Full-Screen App Mode, Remote Help & Exit TV Mode */}
      <div className="pt-3 border-t border-slate-800/80 space-y-1">
        <button
          onClick={toggleKioskFullscreen}
          data-tv-nav="true"
          className="tv-focus w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all"
          title="Full-Screen Native TV App Mode (Hide Browser Bar)"
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <Maximize2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          {isExpanded && (
            <span className="text-xs font-extrabold whitespace-nowrap">
              {isFullscreen ? 'Exit Full-Screen' : 'Full-Screen TV App'}
            </span>
          )}
        </button>

        <button
          onClick={onOpenTvGuide}
          data-tv-nav="true"
          className="tv-focus w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
          title="Airtel Remote Keys Guide"
        >
          <HelpCircle className="w-5 h-5 shrink-0" />
          {isExpanded && <span className="text-xs font-semibold whitespace-nowrap">Remote Guide</span>}
        </button>

        <button
          onClick={onExitTvMode}
          data-tv-nav="true"
          className="tv-focus w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-slate-900 transition-all"
          title="Switch to Standard Mobile/Web Layout"
        >
          <Power className="w-5 h-5 shrink-0" />
          {isExpanded && (
            <span className="text-xs font-semibold whitespace-nowrap">Exit TV Mode</span>
          )}
        </button>
      </div>
    </aside>
  );
};
