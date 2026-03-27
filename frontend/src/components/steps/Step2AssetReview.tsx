import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { getAssets, updateAsset, confirmAssets } from '../../api/client';
import { useSSE } from '../../hooks/useSSE';
import type { Asset, SSEEvent } from '../../types';

// Mock outfit variants per character for multi-episode display
const MOCK_OUTFITS: Record<string, { ep: string; desc: string; color: string }[]> = {
  default_0: [
    { ep: 'EP01', desc: 'Elegant dress, formal setting', color: 'from-violet-400 to-purple-500' },
    { ep: 'EP02', desc: 'Casual outfit, outdoor scene', color: 'from-blue-400 to-cyan-500' },
    { ep: 'EP03', desc: 'Evening gown, banquet scene', color: 'from-pink-400 to-rose-500' },
  ],
  default_1: [
    { ep: 'EP01', desc: 'Victorian dress, interior', color: 'from-amber-400 to-orange-500' },
    { ep: 'EP02', desc: 'Garden party attire', color: 'from-teal-400 to-green-500' },
  ],
};

const ASSET_TYPE_LABEL: Record<Asset['asset_type'], string> = {
  character: '角色',
  scene: '场景',
  prop: '道具',
};

const ASSET_TYPE_COLOR: Record<Asset['asset_type'], string> = {
  character: 'bg-purple-100 text-purple-700',
  scene: 'bg-green-100 text-green-700',
  prop: 'bg-orange-100 text-orange-700',
};

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-teal-500 to-green-600',
];

const Step2AssetReview: React.FC = () => {
  const { activeProjectId, projects, updateProject, setActiveTab } = useAppStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedAssets, setEditedAssets] = useState<Record<string, Partial<Asset>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleSSE = useCallback(
    (event: SSEEvent) => {
      if (event.type === 'status_update' && event.project_id === activeProjectId) {
        const data = event.data as { status?: string };
        if (data.status) {
          updateProject(activeProjectId!, { status: data.status as import('../../types').ProjectStatus });
          // Auto-reload assets when parsing completes
          if (data.status === '待确认') {
            loadAssets();
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeProjectId, updateProject]
  );

  useSSE(activeProjectId, handleSSE);

  const loadAssets = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAssets(activeProjectId);
      setAssets(res.data);
    } catch {
      setError('加载资产列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  const handleFieldChange = (assetId: string, field: keyof Asset, value: string) => {
    setEditedAssets((prev) => ({
      ...prev,
      [assetId]: { ...(prev[assetId] ?? {}), [field]: value },
    }));
  };

  const handleBlur = async (asset: Asset, field: keyof Asset) => {
    const edited = editedAssets[asset.id];
    if (!edited || edited[field] === undefined) return;
    setSavingId(asset.id);
    try {
      await updateAsset(asset.id, { [field]: edited[field] });
      setAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, [field]: edited[field] } : a))
      );
    } catch {
      // silently fail
    } finally {
      setSavingId(null);
    }
  };

  const handleConfirm = async () => {
    if (!activeProjectId) return;
    setConfirming(true);
    try {
      await confirmAssets(activeProjectId);
      updateProject(activeProjectId, { status: '生成中' });
      setShowConfirmDialog(false);
      setActiveTab('3');
    } catch {
      setError('封版操作失败，请重试');
    } finally {
      setConfirming(false);
    }
  };

  const getFieldValue = (asset: Asset, field: keyof Asset): string => {
    const edited = editedAssets[asset.id];
    if (edited && field in edited) return edited[field] as string ?? '';
    return (asset[field] as string) ?? '';
  };

  const getGradient = (id: string) => AVATAR_GRADIENTS[id.charCodeAt(0) % AVATAR_GRADIENTS.length];

  const getOutfits = (index: number) =>
    MOCK_OUTFITS[`default_${index}`] ?? MOCK_OUTFITS['default_0'];

  if (!activeProjectId) {
    return (
      <div className="px-6 py-4 max-w-screen-xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">📂</span>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">未选择项目</h3>
          <p className="text-gray-500 text-sm">请返回工作台选择一个项目</p>
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

  const isAnalyzing = activeProject?.status === '解析中';

  if (isAnalyzing) {
    return (
      <div className="px-6 py-4 max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Step 2 — 资产解析</h1>
          <p className="text-sm text-gray-500 mt-0.5">项目：{activeProject?.title}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-blue-600 text-xl">🔍</span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">AI 正在解析视频资产...</h3>
          <p className="text-sm text-gray-500 text-center max-w-sm">
            系统正在识别角色、场景和道具，预计需要 3-4 秒。<br />
            解析完成后页面将自动刷新资产列表。
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            已通过 SSE 实时监听解析进度
          </div>
        </div>
      </div>
    );
  }

  const characterAssets = assets.filter((a) => a.asset_type === 'character');
  const otherAssets = assets.filter((a) => a.asset_type !== 'character');

  return (
    <div className="px-6 py-4 max-w-screen-2xl mx-auto">
      {/* Hidden file input for local upload */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            alert(`已选择图片: ${e.target.files[0].name}（MVP阶段仅预览，实际上传待接入存储服务）`);
          }
        }}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Step 2 — 资产解析</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            项目：{activeProject?.title} &nbsp;·&nbsp; 共 {assets.length} 项资产
          </p>
        </div>
        <button
          onClick={() => setShowConfirmDialog(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2"
        >
          <span>🔒</span>
          <span>确认资产并封版</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-200">
          <span className="text-5xl mb-4">📋</span>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无资产数据</h3>
          <p className="text-gray-500 text-sm">解析完成后资产将显示在此处</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Column headers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 rounded-xl px-5 py-2.5 text-center">
              <span className="text-sm font-semibold text-gray-600">原版资产（只读）</span>
            </div>
            <div className="bg-blue-50 rounded-xl px-5 py-2.5 text-center border border-blue-200">
              <span className="text-sm font-semibold text-blue-700">AI 本地化版本（可编辑）</span>
            </div>
          </div>

          {/* Character assets with multi-outfit display */}
          {characterAssets.map((asset, idx) => {
            const outfits = getOutfits(idx);
            return (
              <div
                key={asset.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Asset type header */}
                <div className="flex items-center gap-2 px-5 py-2 bg-gray-50 border-b border-gray-200">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ASSET_TYPE_COLOR[asset.asset_type]}`}>
                    {ASSET_TYPE_LABEL[asset.asset_type]}
                  </span>
                  {savingId === asset.id && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      保存中...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-0">
                  {/* Left: Original */}
                  <div className="p-5 border-r border-gray-100">
                    {/* Main character info */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${getGradient(asset.id)} flex items-center justify-center text-white text-2xl font-bold flex-shrink-0`}>
                        {asset.original_name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-base mb-1">
                          {asset.original_name}
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          {asset.original_description || '暂无描述'}
                        </p>
                      </div>
                    </div>

                    {/* Multi-episode outfits (original) */}
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        各集造型 ({outfits.length} 套)
                      </div>
                      <div className="space-y-2">
                        {outfits.map((outfit) => (
                          <div key={outfit.ep} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${outfit.color} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white text-xs font-bold">{outfit.ep}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-500">{outfit.ep}</div>
                              <div className="text-xs text-gray-400 truncate">{outfit.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: AI localized */}
                  <div className="p-5 bg-blue-50/30">
                    {/* Main AI character info */}
                    <div className="flex items-start gap-4 mb-3">
                      {asset.new_image_url ? (
                        <img
                          src={asset.new_image_url}
                          alt={asset.new_name ?? ''}
                          className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border border-blue-200"
                        />
                      ) : (
                        <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${getGradient(asset.id + '1')} flex items-center justify-center text-white flex-shrink-0 border-2 border-dashed border-blue-300`}>
                          <span className="text-xs text-center text-white/80 px-1">AI 生成</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5 font-medium">本地化名称</label>
                          <input
                            type="text"
                            value={getFieldValue(asset, 'new_name')}
                            onChange={(e) => handleFieldChange(asset.id, 'new_name', e.target.value)}
                            onBlur={() => handleBlur(asset, 'new_name')}
                            placeholder="输入本地化名称..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5 font-medium">本地化描述</label>
                          <textarea
                            value={getFieldValue(asset, 'new_description')}
                            onChange={(e) => handleFieldChange(asset.id, 'new_description', e.target.value)}
                            onBlur={() => handleBlur(asset, 'new_description')}
                            placeholder="输入角色描述..."
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => alert('更换资产：可将此角色替换为其他已有资产（功能开发中）')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                      >
                        <span>🔄</span>更换资产
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                      >
                        <span>📁</span>本地上传
                      </button>
                      <button
                        onClick={() => alert(`正在为「${getFieldValue(asset, 'new_name') || asset.original_name}」重新生成 AI 参考图...`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-blue-600 border border-blue-600 rounded-lg text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                      >
                        <span>✨</span>AI生成
                      </button>
                    </div>

                    {/* Multi-episode outfits (AI localized) */}
                    <div>
                      <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">
                        各集造型 ({outfits.length} 套)
                      </div>
                      <div className="space-y-2">
                        {outfits.map((outfit) => (
                          <div key={outfit.ep} className="flex items-center gap-3 p-2.5 bg-white/70 rounded-lg border border-blue-100">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${outfit.color} flex items-center justify-center flex-shrink-0 opacity-70`}>
                              <span className="text-white text-xs font-bold">{outfit.ep}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-500">{outfit.ep}</div>
                              <input
                                type="text"
                                defaultValue={outfit.desc}
                                className="w-full text-xs text-gray-500 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5 transition-all"
                                placeholder="编辑造型描述..."
                              />
                            </div>
                            <button
                              onClick={() => alert(`重新生成 ${outfit.ep} 造型图片`)}
                              className="flex-shrink-0 text-xs text-blue-500 hover:text-blue-700 font-medium"
                            >
                              重生成
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Non-character assets (scene, prop) */}
          {otherAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-2 px-5 py-2 bg-gray-50 border-b border-gray-200">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ASSET_TYPE_COLOR[asset.asset_type]}`}>
                  {ASSET_TYPE_LABEL[asset.asset_type]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-0">
                <div className="p-5 border-r border-gray-100">
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getGradient(asset.id)} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
                      {asset.original_name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">{asset.original_name}</div>
                      <p className="text-sm text-gray-500">{asset.original_description}</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-blue-50/30">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={getFieldValue(asset, 'new_name')}
                      onChange={(e) => handleFieldChange(asset.id, 'new_name', e.target.value)}
                      onBlur={() => handleBlur(asset, 'new_name')}
                      placeholder="本地化名称..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <textarea
                      value={getFieldValue(asset, 'new_description')}
                      onChange={(e) => handleFieldChange(asset.id, 'new_description', e.target.value)}
                      onBlur={() => handleBlur(asset, 'new_description')}
                      placeholder="本地化描述..."
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                        <span>📁</span>本地上传
                      </button>
                      <button onClick={() => alert('AI 重新生成参考图')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-600 rounded-lg text-xs text-white hover:bg-blue-700 transition-colors">
                        <span>✨</span>AI生成
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 text-xl">⚠</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">确认资产并封版</h3>
                <p className="text-sm text-gray-600 mt-1">
                  确认封版后将进入视频制作阶段，<strong>基础人设不可再更改</strong>。请确保所有角色和场景信息已审核完毕。
                </p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
              <p className="text-xs text-amber-700">
                💡 封版后 AI 将开始生成所有镜头的翻拍视频，此过程不可逆。请确认无误后再操作。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                取消，继续编辑
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {confirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    处理中...
                  </span>
                ) : '确认封版，进入制作'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step2AssetReview;
