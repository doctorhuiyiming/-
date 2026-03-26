import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { getAudioTracks, updateAudioTrack as apiUpdateAudioTrack, getSlices } from '../../api/client';
import type { AudioTrack, Slice } from '../../types';

const TRACK_COLORS: Record<AudioTrack['track_type'], string> = {
  translated_voice: 'bg-blue-500',
  original_voice: 'bg-gray-500',
  bgm: 'bg-yellow-500',
};

const TRACK_LABELS: Record<AudioTrack['track_type'], string> = {
  translated_voice: '翻译后音频',
  original_voice: '原音频',
  bgm: '背景音 (BGM)',
};

const TOTAL_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface DragState {
  trackId: string;
  startX: number;
  startLeft: number;
}

const Step4AudioVideo: React.FC = () => {
  const { activeProjectId, projects, audioTracks, setAudioTracks, updateAudioTrack, slices, setSlices, setActiveTab } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockPositions, setBlockPositions] = useState<Record<string, number>>({});
  const dragState = useRef<DragState | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  useEffect(() => {
    if (!activeProjectId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [tracksRes, slicesRes] = await Promise.all([
          getAudioTracks(activeProjectId),
          getSlices(activeProjectId),
        ]);
        setAudioTracks(tracksRes.data);
        setSlices(slicesRes.data);

        const positions: Record<string, number> = {};
        tracksRes.data.forEach((track) => {
          positions[track.id] = (track.offset_ms / TOTAL_DURATION_MS) * 100;
        });
        setBlockPositions(positions);
      } catch {
        setError('加载音轨数据失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeProjectId, setAudioTracks, setSlices]);

  const handleMouseDown = useCallback((e: React.MouseEvent, trackId: string) => {
    e.preventDefault();
    const timelineEl = timelineRef.current;
    if (!timelineEl) return;
    const rect = timelineEl.getBoundingClientRect();
    const currentLeftPct = blockPositions[trackId] ?? 0;
    const currentLeftPx = (currentLeftPct / 100) * rect.width;
    dragState.current = { trackId, startX: e.clientX, startLeft: currentLeftPx };
  }, [blockPositions]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current) return;
    const timelineEl = timelineRef.current;
    if (!timelineEl) return;
    const rect = timelineEl.getBoundingClientRect();
    const { trackId, startX, startLeft } = dragState.current;
    const deltaX = e.clientX - startX;
    const newLeftPx = Math.max(0, Math.min(rect.width - 120, startLeft + deltaX));
    const newLeftPct = (newLeftPx / rect.width) * 100;
    setBlockPositions((prev) => ({ ...prev, [trackId]: newLeftPct }));
  }, []);

  const handleMouseUp = useCallback(async () => {
    if (!dragState.current) return;
    const { trackId } = dragState.current;
    dragState.current = null;
    const timelineEl = timelineRef.current;
    if (!timelineEl) return;
    const rect = timelineEl.getBoundingClientRect();
    const leftPct = blockPositions[trackId] ?? 0;
    const leftPx = (leftPct / 100) * rect.width;
    const newOffsetMs = Math.round((leftPx / rect.width) * TOTAL_DURATION_MS);
    updateAudioTrack(trackId, { offset_ms: newOffsetMs });
    try {
      await apiUpdateAudioTrack(trackId, { offset_ms: newOffsetMs });
    } catch {
      // silently fail
    }
  }, [blockPositions, updateAudioTrack]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleToggleMute = async (track: AudioTrack) => {
    const newMuted = !track.is_muted;
    updateAudioTrack(track.id, { is_muted: newMuted });
    try {
      await apiUpdateAudioTrack(track.id, { is_muted: newMuted });
    } catch {
      // revert
      updateAudioTrack(track.id, { is_muted: track.is_muted });
    }
  };

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const allDialogues = slices.flatMap((slice: Slice) =>
    slice.original_dialogue.map((d) => ({
      speaker: d.speaker,
      original: d.text,
      translated: d.translated,
      sliceIndex: slice.slice_index,
    }))
  );

  if (!activeProjectId) {
    return (
      <div className="px-6 py-4 max-w-screen-xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">🎵</span>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">未选择项目</h3>
          <button
            onClick={() => setActiveTab('0')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            返回工作台
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Step 4 — 音视频校对</h1>
          <p className="text-sm text-gray-500">{activeProject?.title}</p>
        </div>
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            {error}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top section: dialogue + dual video */}
          <div className="flex flex-1 overflow-hidden border-b border-gray-200 min-h-0">
            {/* Left: dialogue list */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto bg-gray-50 flex-shrink-0">
              <div className="sticky top-0 bg-gray-100 border-b border-gray-200 px-4 py-2 z-10">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  双语对白
                </span>
              </div>
              {allDialogues.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                  暂无对白数据
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {allDialogues.map((d, i) => (
                    <div key={i} className="px-4 py-3 hover:bg-white transition-colors">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                          {d.speaker}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">#{d.sliceIndex}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed mb-1">
                        {d.original}
                      </p>
                      {d.translated && (
                        <p className="text-sm text-gray-400 leading-relaxed border-l-2 border-blue-200 pl-2">
                          {d.translated}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: dual video player */}
            <div className="flex-1 flex flex-col">
              {/* Dual players */}
              <div className="flex flex-1 overflow-hidden">
                {/* Original player */}
                <div className="flex-1 border-r border-gray-200 flex flex-col">
                  <div className="bg-gray-800 px-3 py-1.5 flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium">原片播放器</span>
                    <span className="text-xs text-gray-500">Original</span>
                  </div>
                  <div className="flex-1 bg-gray-900 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950 opacity-80" />
                    <div className="relative z-10 flex flex-col items-center gap-3 text-gray-600">
                      <div className="w-14 h-14 rounded-full bg-gray-700/50 flex items-center justify-center">
                        <span className="text-2xl">▶</span>
                      </div>
                      <span className="text-xs">原片视频</span>
                    </div>
                  </div>
                </div>

                {/* Remake player */}
                <div className="flex-1 flex flex-col">
                  <div className="bg-blue-900 px-3 py-1.5 flex items-center justify-between">
                    <span className="text-xs text-blue-300 font-medium">翻拍播放器</span>
                    <span className="text-xs text-blue-400">Remake</span>
                  </div>
                  <div className="flex-1 bg-gray-900 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-950 to-gray-950 opacity-80" />
                    <div className="relative z-10 flex flex-col items-center gap-3 text-blue-700">
                      <div className="w-14 h-14 rounded-full bg-blue-800/30 flex items-center justify-center">
                        <span className="text-2xl">▶</span>
                      </div>
                      <span className="text-xs text-blue-500">翻拍视频</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Playback controls */}
              <div className="bg-gray-900 px-4 py-2.5 flex items-center gap-4 flex-shrink-0">
                <button
                  onClick={() => setIsPlaying((p) => !p)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <div className="flex-1 bg-gray-700 rounded-full h-1.5 cursor-pointer">
                  <div className="bg-blue-500 h-1.5 rounded-full w-0" />
                </div>
                <span className="text-xs text-gray-400 font-mono whitespace-nowrap">0:00 / 30:00</span>
              </div>
            </div>
          </div>

          {/* Bottom: multi-track timeline NLE */}
          <div className="bg-gray-900 flex-shrink-0" style={{ minHeight: '200px' }}>
            <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                多轨时间线
              </span>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>0:00</span>
                <span>10:00</span>
                <span>20:00</span>
                <span>30:00</span>
              </div>
            </div>

            {/* Timeline ruler */}
            <div className="flex" ref={timelineRef}>
              <div style={{ width: 120 }} className="flex-shrink-0" />
              <div className="flex-1 relative h-4 border-b border-gray-700">
                {[0, 25, 50, 75, 100].map((pct) => (
                  <div
                    key={pct}
                    className="absolute top-0 bottom-0 border-l border-gray-700"
                    style={{ left: `${pct}%` }}
                  >
                    <span className="text-xs text-gray-600 pl-0.5 text-[10px]">
                      {formatMs((pct / 100) * TOTAL_DURATION_MS)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracks */}
            {audioTracks.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-600 text-sm">
                暂无音轨数据
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {audioTracks.map((track) => (
                  <div key={track.id} className="flex items-center h-14">
                    {/* Track label */}
                    <div
                      style={{ width: 120 }}
                      className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-gray-700 h-full bg-gray-850"
                    >
                      <button
                        onClick={() => handleToggleMute(track)}
                        className="text-base leading-none hover:scale-110 transition-transform"
                        title={track.is_muted ? '取消静音' : '静音'}
                      >
                        {track.is_muted ? '🔇' : '🔊'}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-300 truncate font-medium">
                          {track.label ?? TRACK_LABELS[track.track_type]}
                        </div>
                        <div className="text-xs text-gray-600 font-mono">
                          {formatMs(track.offset_ms)}
                        </div>
                      </div>
                    </div>

                    {/* Timeline area */}
                    <div
                      className="flex-1 relative h-full bg-gray-800 overflow-hidden cursor-default"
                    >
                      {/* Grid lines */}
                      {[25, 50, 75].map((pct) => (
                        <div
                          key={pct}
                          className="absolute top-0 bottom-0 border-l border-gray-700/50"
                          style={{ left: `${pct}%` }}
                        />
                      ))}

                      {/* Draggable block */}
                      <div
                        className={`absolute top-2 bottom-2 rounded-md cursor-grab active:cursor-grabbing select-none flex items-center px-2 ${
                          TRACK_COLORS[track.track_type]
                        } ${track.is_muted ? 'opacity-40' : 'opacity-80 hover:opacity-100'} transition-opacity`}
                        style={{
                          left: `${blockPositions[track.id] ?? 0}%`,
                          width: '120px',
                          minWidth: '80px',
                        }}
                        onMouseDown={(e) => handleMouseDown(e, track.id)}
                      >
                        <span className="text-white text-xs font-medium truncate select-none">
                          {track.label ?? TRACK_LABELS[track.track_type]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Step4AudioVideo;
