import React from 'react';
import { STREAM_SERVERS } from '../data/servers';
import { StreamServer } from '../types';
import { Check, Shield, Sparkles, Zap, Radio, Globe, Volume2 } from 'lucide-react';

interface ServerSelectorProps {
  currentServerId: string;
  onSelectServer: (server: StreamServer) => void;
  onClose?: () => void;
}

export const ServerSelector: React.FC<ServerSelectorProps> = ({
  currentServerId,
  onSelectServer,
  onClose,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl text-left space-y-4 max-w-2xl w-full">
      {/* Title & Help Banner */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-display">
            <Radio className="w-4 h-4 text-amber-400" />
            <span>Select Streaming Server</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Switch between MultiEmbed, VidSrc SU, and Embed.su for the best buffer-free 1080p stream.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="tv-focus text-slate-400 hover:text-white px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700"
          >
            Close
          </button>
        )}
      </div>

      {/* Quality Advisory Banner */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-300">Pro Tip:</span> Server 1 (MultiEmbed) and Server 2 (VidSrc SU) provide clean playback without embed restrictions. For Hindi dubs, use Server 1.
        </div>
      </div>

      {/* Server List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
        {STREAM_SERVERS.map((server, idx) => {
          const isSelected = server.id === currentServerId;
          return (
            <button
              key={server.id}
              onClick={() => {
                onSelectServer(server);
                if (onClose) onClose();
              }}
              className={`tv-focus flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    #{idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {server.name}
                  </span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-amber-400" />}
              </div>

              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {server.badge}
                </span>
                <span className="text-[10px] text-slate-400">
                  {server.quality}
                </span>
              </div>

              {server.notes && (
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {server.notes}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
