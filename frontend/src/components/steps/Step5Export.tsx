import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { exportProject } from '../../api/client';

interface ExportResult {
  download_url?: string;
  message?: string;
  job_id?: string;
}

const Step5Export: React.FC = () => {
  const { activeProjectId, projects, slices, audioTracks, setActiveTab } = useAppStore();
  const [exportingMode, setExportingMode] = useState<'full_video' | 'raw_assets' | null>(null);
  const [results, setResults] = useState<Record<string, ExportResult>>({});
  const [error, setError] = useState<string | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const adoptedSlices = slices.filter((s) => s.adopted_task_id !== null);
  const videoTracks = adoptedSlices.map((s) => ({
    slice_id: s.id,
    task_id: s.adopted_task_id!,
  }));
  const audioPayload = audioTracks.map((t) => ({
    track_id: t.id,
    offset_ms: t.offset_ms,
  }));

  const handleExport = async (mode: 'full_video' | 'raw_assets') => {
    if (!activeProjectId) return;
    setExportingMode(mode);
    setError(null);
    try {
      const res = await exportProject({
        project_id: activeProjectId,
        export_mode: mode,
        video_tracks: videoTracks,
        audio_tracks: audioPayload,
      });
      setResults((prev) => ({ ...prev, [mode]: res.data as ExportResult }));
    } catch (err) {
      setError('导出请求失败，请检查后端服务或稍后重试');
    } finally {
      setExportingMode(null);
    }
  };

  if (!activeProjectId) {
    return (
      <div className="px-6 py-4 max-w-screen-xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">📦</span>
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
    <div className="px-6 py-4 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Step 5 — 资产导出</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          项目：{activeProject?.title ?? activeProjectId}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Project summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>项目导出概况</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{slices.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">总镜头数</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{adoptedSlices.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">已采纳镜头</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{audioTracks.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">音轨数量</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-700">
              {activeProject?.episode_count ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">集数</div>
          </div>
        </div>

        {adoptedSlices.length < slices.length && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
            <span>⚠</span>
            <span>
              还有 {slices.length - adoptedSlices.length} 个镜头未采纳版本，导出时将使用第一个可用版本。
            </span>
          </div>
        )}
      </div>

      {/* Export options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Option 1: Full video */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5">
            <div className="text-3xl mb-2">🎬</div>
            <h3 className="text-white font-bold text-lg">导出完整成片</h3>
            <p className="text-blue-200 text-sm mt-0.5">将所有镜头合并为完整视频文件</p>
          </div>
          <div className="p-5">
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                <span>自动合并所有采纳镜头</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                <span>混入翻译后音频 + BGM</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                <span>输出 MP4 (H.264 / 1080p)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="text-blue-400">ℹ</span>
                <span>预计处理时间：5-15 分钟</span>
              </div>
            </div>

            {results['full_video'] ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1.5">
                  <span>✅</span>
                  <span>导出任务已提交</span>
                </div>
                {results['full_video'].download_url ? (
                  <a
                    href={results['full_video'].download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    <span>⬇</span>
                    <span>点击下载成片</span>
                  </a>
                ) : (
                  <p className="text-xs text-green-600">
                    {results['full_video'].message ?? '正在后台处理，完成后将通知您'}
                    {results['full_video'].job_id && (
                      <span className="ml-1 text-gray-500">
                        (任务 ID: {results['full_video'].job_id})
                      </span>
                    )}
                  </p>
                )}
              </div>
            ) : null}

            <button
              onClick={() => handleExport('full_video')}
              disabled={exportingMode !== null}
              className={`w-full py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                exportingMode === 'full_video'
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : exportingMode !== null
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md active:scale-[0.99]'
              }`}
            >
              {exportingMode === 'full_video' ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>正在提交...</span>
                </>
              ) : (
                <>
                  <span>🎬</span>
                  <span>导出完整成片 (MP4)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Option 2: Raw assets */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5">
            <div className="text-3xl mb-2">📦</div>
            <h3 className="text-white font-bold text-lg">导出独立素材包</h3>
            <p className="text-orange-100 text-sm mt-0.5">适合在剪映等工具中二次编辑</p>
          </div>
          <div className="p-5">
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                <span>每个镜头独立视频文件</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                <span>分离音频轨道（WAV 格式）</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                <span>包含元数据 JSON + 字幕文件</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="text-blue-400">ℹ</span>
                <span>预计处理时间：2-5 分钟</span>
              </div>
            </div>

            {results['raw_assets'] ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1.5">
                  <span>✅</span>
                  <span>素材包导出任务已提交</span>
                </div>
                {results['raw_assets'].download_url ? (
                  <a
                    href={results['raw_assets'].download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    <span>⬇</span>
                    <span>点击下载素材包 (ZIP)</span>
                  </a>
                ) : (
                  <p className="text-xs text-green-600">
                    {results['raw_assets'].message ?? '正在后台打包，完成后将通知您'}
                    {results['raw_assets'].job_id && (
                      <span className="ml-1 text-gray-500">
                        (任务 ID: {results['raw_assets'].job_id})
                      </span>
                    )}
                  </p>
                )}
              </div>
            ) : null}

            <button
              onClick={() => handleExport('raw_assets')}
              disabled={exportingMode !== null}
              className={`w-full py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                exportingMode === 'raw_assets'
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : exportingMode !== null
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow-md active:scale-[0.99]'
              }`}
            >
              {exportingMode === 'raw_assets' ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>正在提交...</span>
                </>
              ) : (
                <>
                  <span>📦</span>
                  <span>导出独立素材包 (供剪映使用)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Export payload preview */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span>⚙</span>
          <span>导出配置预览</span>
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-600 overflow-x-auto">
          <pre>{JSON.stringify(
            {
              project_id: activeProjectId,
              video_tracks: videoTracks.slice(0, 3).map((t) => ({ ...t, slice_id: t.slice_id.slice(0, 8) + '...' })),
              audio_tracks: audioPayload,
              total_video_tracks: videoTracks.length,
            },
            null,
            2
          )}</pre>
        </div>
      </div>

      {/* Footer navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setActiveTab('4')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-lg transition-colors"
        >
          <span>←</span>
          <span>返回音视频校对</span>
        </button>
        <button
          onClick={() => setActiveTab('0')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium border border-blue-300 hover:border-blue-400 px-4 py-2 rounded-lg transition-colors"
        >
          <span>返回工作台</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};

export default Step5Export;
