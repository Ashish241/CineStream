import React, { useState } from 'react';
import { X, Play, SlidersHorizontal, Sparkles } from 'lucide-react';
import { STREAM_SERVERS } from '../data/servers';
import { MediaItem, StreamServer } from '../types';

interface DirectIdModalProps {
  onPlayDirect: (params: {
    type: 'movie' | 'tv';
    id: string;
    season: number;
    episode: number;
    server: StreamServer;
    title?: string;
  }) => void;
  onClose: () => void;
}

export const DirectIdModal: React.FC<DirectIdModalProps> = ({
  onPlayDirect,
  onClose,
}) => {
  const [type, setType] = useState<'movie' | 'tv'>('movie');
  const [idInput, setIdInput] = useState('tt1375666'); // Default Inception from user's original code
  const [titleInput, setTitleInput] = useState('');
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [selectedServerId, setSelectedServerId] = useState(STREAM_SERVERS[0].id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = idInput.trim();
    if (!cleanId) return;

    const chosenServer =
      STREAM_SERVERS.find((s) => s.id === selectedServerId) || STREAM_SERVERS[0];

    onPlayDirect({
      type,
      id: cleanId,
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      server: chosenServer,
      title: titleInput.trim() || `Media (${cleanId})`,
    });
    onClose();
  };

  const presets = [
    { title: 'Inception', id: 'tt1375666', type: 'movie' as const },
    { title: 'Mirzapur', id: 'tt6473300', type: 'tv' as const, s: 3, e: 1 },
    { title: 'Dune: Part Two', id: 'tt15239678', type: 'movie' as const },
    { title: 'Breaking Bad', id: 'tt0903747', type: 'tv' as const, s: 1, e: 1 },
    { title: 'Stranger Things', id: 'tt4574334', type: 'tv' as const, s: 4, e: 1 },
    { title: '12th Fail', id: 'tt23561236', type: 'movie' as const },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white font-display">
              Custom IMDb / TMDB Direct Stream
            </h2>
          </div>
          <button
            onClick={onClose}
            className="tv-focus p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-400">
            Paste any custom IMDb ID (e.g. <code className="text-amber-400 font-mono">tt1375666</code>) or TMDB ID directly.
          </p>

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Content Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setType('movie')}
                className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                  type === 'movie'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Movie
              </button>
              <button
                type="button"
                onClick={() => setType('tv')}
                className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                  type === 'tv'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                TV / Web Series
              </button>
            </div>
          </div>

          {/* ID Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              IMDb ID or TMDB ID <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder="e.g. tt1375666 or 550"
              className="tv-focus w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:border-amber-500"
            />
          </div>

          {/* Optional Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Custom Title (Optional)
            </label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="e.g. Inception (2010)"
              className="tv-focus w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500"
            />
          </div>

          {/* Season & Episode (if TV) */}
          {type === 'tv' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Season
                </label>
                <input
                  type="number"
                  min="1"
                  value={season}
                  onChange={(e) => setSeason(parseInt(e.target.value) || 1)}
                  className="tv-focus w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Episode
                </label>
                <input
                  type="number"
                  min="1"
                  value={episode}
                  onChange={(e) => setEpisode(parseInt(e.target.value) || 1)}
                  className="tv-focus w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Server Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Streaming Server
            </label>
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="tv-focus w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-amber-500"
            >
              {STREAM_SERVERS.map((server, i) => (
                <option key={server.id} value={server.id}>
                  Server {i + 1}: {server.name} ({server.badge})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Presets */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
              Quick Test Presets:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    setType(p.type);
                    setIdInput(p.id);
                    setTitleInput(p.title);
                    if (p.s) setSeason(p.s);
                    if (p.e) setEpisode(p.e);
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="tv-focus w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Launch Stream</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
