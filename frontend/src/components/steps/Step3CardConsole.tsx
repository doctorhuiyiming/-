import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { getSlices, updateSlice as apiUpdateSlice, generateGroup, adoptTask } from '../../api/client';
import { useSSE } from '../../hooks/useSSE';
import type { Slice, SSEEvent } from '../../types';

const VbenchBadge: React.FC<{ score: number | null }> = ({ score }) => {
  if (score === null) return null;
  const color =
    score >= 80
      ? 'bg-green-100 text-green-800 border-green-200'
      : score >= 60
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
      : 'bg-red-100 text-red-800 border-red-200';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${color}`}>
      V {score}
    </span>
  );
};

const Step3CardConsole: React.FC = () => {
  const { activeProjectId, projects, slices, setSlices, updateSlice, setActiveTab } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [localPrompts, setLocalPrompts] = useState<Record<string, string>>({});
  const [localDescs, setLocalDescs] = useState<Record<string, string>>({});
  const [batchLoading, setBatchLoading] = useState(false);
  const [adoptingId, setAdoptingId] = useState<string | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleSSE = useCallback(
    (event: SSEEvent) => {
      if (event.type === 'slice_update') {
        const d = event.data as {
          slice_id?: string;
          status?: string;
          vbench_score?: number;
          video_url?: string;
          error_message?: string;
        };
        if (d.slice_id) {
          updateSlice(d.slice_id, {
            status: d.status as Slice['status'],
            vbench_score: d.vbench_score ?? null,
            ai_video_url: d.video_url ?? null,
            error_message: d.error_message ?? null,
          });
        }
      }
    },
    [updateSlice]
  );

  useSSE(activeProjectId, handleSSE);

  useEffect(() => {
    if (!activeProjectId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getSlices(activeProjectId);
        setSlices(res.data);
        const initPrompts: Record<string, string> = {};
        const initDescs: Record<string, string> = {};
        res.data.forEach((s) => {
          initPrompts[s.id] = s.prompt ?? `Elena [action]. cinematic lighting, 4k.`;
          initDescs[s.id] = s.ai_description ?? s.original_description;
        });
        setLocalPrompts(initPrompts);
        setLocalDescs(initDescs);
      } catch {
        setError('加载镜头列表失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeProjectId, setSlices]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === slices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(slices.map((s) => s.id)));
    }
  };

  const handleSaveSlice = async (slice: Slice) => {
    const prompt = localPrompts[slice.id];
    const aiDesc = localDescs[slice.id];
    try {
      await apiUpdateSlice(slice.id, { prompt, ai_description: aiDesc });
    } catch {
      // silently fail
    }
  };

  const handleBatchGenerate = async () => {
    if (selectedIds.size === 0) return;
    const prompts: Record<string, string> = {};
    selectedIds.forEach((id) => {
      prompts[id] = localPrompts[id] ?? '';
    });
    setBatchLoading(true);
    try {
      await generateGroup({ slice_ids: Array.from(selectedIds), prompts });
      selectedIds.forEach((id) => {
        updateSlice(id, { status: 'generating' });
      });
      setSelectedIds(new Set());
    } catch {
      setError('批量生成请求失败，请重试');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleAdoptTask = async (slice: Slice, taskId: string) => {
    setAdoptingId(taskId);
    try {
      await adoptTask(slice.id, taskId);
      updateSlice(slice.id, { adopted_task_id: taskId });
    } catch {
      // silently fail
    } finally {
      setAdoptingId(null);
    }
  };

  if (!activeProjectId) {
    return (
      <div className="px-6 py-4 max-w-screen-xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">🃏</span>
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
    <div className="px-4 py-4 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Step 3 — 抽卡控制台</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            项目：{activeProject?.title} &nbsp;·&nbsp;
            {slices.length} 个镜头 &nbsp;·&nbsp;
            {slices.filter((s) => s.status === 'completed').length} 个已完成
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            已选 {selectedIds.size} / {slices.length}
          </span>
          <button
            onClick={handleBatchGenerate}
            disabled={selectedIds.size === 0 || batchLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedIds.size > 0 && !batchLoading
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {batchLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <span>🎴</span>
                <span>批量重抽</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : slices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-200">
          <span className="text-5xl mb-4">🎬</span>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无镜头数据</h3>
          <p className="text-gray-500 text-sm">完成资产封版后，AI 将自动生成镜头列表</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_1fr_1.5fr_1fr_1fr] gap-0 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <div className="px-3 py-2.5 flex items-center">
              <input
                type="checkbox"
                checked={selectedIds.size === slices.length && slices.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
              />
            </div>
            <div className="px-3 py-2.5">镜头信息</div>
            <div className="px-3 py-2.5">原始描述</div>
            <div className="px-3 py-2.5">AI 生成结果</div>
            <div className="px-3 py-2.5">翻拍描述</div>
            <div className="px-3 py-2.5">生成提示词</div>
          </div>

          {/* Table body */}
          <div className="divide-y divide-gray-100">
            {slices.map((slice) => (
              <div
                key={slice.id}
                className={`grid grid-cols-[auto_1fr_1fr_1.5fr_1fr_1fr] gap-0 hover:bg-gray-50/50 transition-colors ${
                  selectedIds.has(slice.id) ? 'bg-blue-50/40' : ''
                }`}
              >
                {/* Col 1: Checkbox + thumbnail + index + time */}
                <div className="px-3 py-3 flex flex-col items-center gap-2 border-r border-gray-100">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(slice.id)}
                    onChange={() => toggleSelect(slice.id)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                  <div className="w-14 h-10 bg-gray-800 rounded-md flex items-center justify-center text-gray-500 text-xs font-mono overflow-hidden">
                    {slice.ai_video_url ? (
                      <video src={slice.ai_video_url} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-600">▶</span>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-700">#{slice.slice_index}</div>
                    <div className="text-xs text-gray-400 font-mono">
                      {slice.time_start}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {slice.time_end}
                    </div>
                  </div>
                </div>

                {/* Col 2: Original description */}
                <div className="px-3 py-3 border-r border-gray-100">
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-6">
                    {slice.original_description}
                  </p>
                </div>

                {/* Col 3: Original dialogue */}
                <div className="px-3 py-3 border-r border-gray-100">
                  <div className="space-y-1.5">
                    {slice.original_dialogue.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">无对白</span>
                    ) : (
                      slice.original_dialogue.map((d, i) => (
                        <div key={i} className="text-xs">
                          <span className="inline-block bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium mr-1">
                            {d.speaker}
                          </span>
                          <span className="text-gray-600">{d.text}</span>
                          {d.translated && (
                            <div className="text-gray-400 ml-0 mt-0.5 pl-1 border-l-2 border-gray-200">
                              {d.translated}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Col 4: AI generation result */}
                <div className="px-3 py-3 border-r border-gray-100">
                  {slice.status === 'pending' && (
                    <div className="flex items-center justify-center h-full py-4">
                      <span className="text-xs text-gray-400">等待生成</span>
                    </div>
                  )}

                  {slice.status === 'generating' && (
                    <div className="flex flex-col items-center justify-center py-4 gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-blue-600">生成中...</span>
                    </div>
                  )}

                  {slice.status === 'failed' && (
                    <div className="space-y-2">
                      <div className="border border-red-300 rounded-lg p-2 bg-red-50">
                        <p className="text-xs text-red-600 mb-1.5">
                          {slice.error_message ?? '生成失败'}
                        </p>
                        <button
                          onClick={() => {
                            setSelectedIds(new Set([slice.id]));
                          }}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors"
                        >
                          修改提示词重试
                        </button>
                      </div>
                    </div>
                  )}

                  {slice.status === 'completed' && (
                    <div className="space-y-2">
                      {/* Video player placeholder */}
                      <div className="relative w-full h-28 bg-gray-800 rounded-lg overflow-hidden group cursor-pointer">
                        {slice.ai_video_url ? (
                          <video
                            src={slice.ai_video_url}
                            className="w-full h-full object-cover"
                            controls={false}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                              <span className="text-white text-sm ml-0.5">▶</span>
                            </div>
                          </div>
                        )}
                        <div className="absolute top-1.5 right-1.5">
                          <VbenchBadge score={slice.vbench_score} />
                        </div>
                      </div>

                      {/* Version dropdown + adopt */}
                      {slice.tasks.length > 0 && (
                        <div className="space-y-1">
                          <select className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400">
                            {slice.tasks.map((task, i) => (
                              <option key={task.id} value={task.id}>
                                版本 {i + 1} &nbsp;
                                {task.vbench_score != null ? `(VBench: ${task.vbench_score})` : ''}
                                {task.status === 'completed' ? ' ✓' : ''}
                              </option>
                            ))}
                          </select>

                          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name={`adopt-${slice.id}`}
                              checked={slice.adopted_task_id === slice.tasks[0]?.id}
                              onChange={() => {
                                const t = slice.tasks[0];
                                if (t) handleAdoptTask(slice, t.id);
                              }}
                              className="text-blue-600"
                            />
                            <span className={slice.adopted_task_id ? 'text-green-700 font-medium' : 'text-gray-600'}>
                              {adoptingId && slice.tasks.some((t) => t.id === adoptingId)
                                ? '处理中...'
                                : slice.adopted_task_id
                                ? '✓ 已采纳此版本'
                                : '采纳此版本'}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Col 5: AI description (editable) */}
                <div className="px-3 py-3 border-r border-gray-100">
                  <textarea
                    value={localDescs[slice.id] ?? ''}
                    onChange={(e) =>
                      setLocalDescs((prev) => ({ ...prev, [slice.id]: e.target.value }))
                    }
                    onBlur={() => handleSaveSlice(slice)}
                    placeholder="AI 翻拍描述..."
                    rows={5}
                    className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none text-gray-700 bg-white"
                  />
                </div>

                {/* Col 6: Prompt (editable) */}
                <div className="px-3 py-3">
                  <textarea
                    value={localPrompts[slice.id] ?? ''}
                    onChange={(e) =>
                      setLocalPrompts((prev) => ({ ...prev, [slice.id]: e.target.value }))
                    }
                    onBlur={() => handleSaveSlice(slice)}
                    placeholder="Enter generation prompt..."
                    rows={5}
                    className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none font-mono text-gray-700 bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Step3CardConsole;
