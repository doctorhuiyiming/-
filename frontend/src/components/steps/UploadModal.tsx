import React, { useState, useEffect, useRef } from 'react';
import { createProject } from '../../api/client';
import { useAppStore } from '../../store/appStore';

interface UploadModalProps {
  targetRegion?: string;
  onClose: () => void;
}

interface MockFile {
  id: number;
  name: string;
  size: string;
  progress: number;
  done: boolean;
}

const MOCK_FILES: Omit<MockFile, 'progress' | 'done'>[] = [
  { id: 1, name: 'episode_01.mp4', size: '234 MB' },
  { id: 2, name: 'episode_02.mp4', size: '198 MB' },
  { id: 3, name: 'episode_03.mp4', size: '215 MB' },
  { id: 4, name: 'episode_04.mp4', size: '201 MB' },
];

const UploadModal: React.FC<UploadModalProps> = ({ targetRegion, onClose }) => {
  const { addProject, setActiveProjectId, setActiveTab } = useAppStore();

  const [files, setFiles] = useState<MockFile[]>(
    MOCK_FILES.map((f) => ({ ...f, progress: 0, done: false }))
  );
  const [selectedFile, setSelectedFile] = useState<MockFile | null>(null);
  const [title, setTitle] = useState('');
  const [originalLanguage, setOriginalLanguage] = useState('zh-CN');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allDone = files.every((f) => f.done);

  useEffect(() => {
    setSelectedFile(MOCK_FILES[0] ? { ...MOCK_FILES[0], progress: 0, done: false } : null);

    intervalRef.current = setInterval(() => {
      setFiles((prev) => {
        const updated = prev.map((f) => {
          if (f.done) return f;
          const increment = Math.random() * 15 + 5;
          const newProgress = Math.min(f.progress + increment, 100);
          return { ...f, progress: newProgress, done: newProgress >= 100 };
        });
        return updated;
      });
    }, 600);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (allDone && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [allDone]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('请输入剧名');
      return;
    }
    if (!allDone) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await createProject({
        title: title.trim(),
        original_language: originalLanguage,
        target_region: targetRegion ?? '欧美/英语',
        notes: notes.trim() || undefined,
      });
      addProject(res.data);
      setActiveProjectId(res.data.id);
      setActiveTab('0');
      onClose();
    } catch {
      setError('提交失败，请检查后端服务是否运行');
    } finally {
      setSubmitting(false);
    }
  };

  const totalDone = files.filter((f) => f.done).length;
  const avgProgress = files.reduce((sum, f) => sum + f.progress, 0) / files.length;

  const estimatedSpeed = '12.3 MB/s';
  const estimatedTime = allDone ? '已完成' : `约 ${Math.ceil((100 - avgProgress) / 8)}s`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[680px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">📤</span>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">上传视频并创建项目</h2>
              <p className="text-xs text-gray-500">
                目标地区：{targetRegion ?? '欧美/英语'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Three-column body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Upload queue */}
          <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <span>+</span> 上传视频
              </button>
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>视频 {totalDone}/{files.length}</span>
                  <span className="text-blue-600 font-medium">{Math.round(avgProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${avgProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{estimatedSpeed}</span>
                  <span>{estimatedTime}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    selectedFile?.id === file.id
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="bg-gray-800 p-2.5">
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-xs font-bold text-white bg-blue-600 w-5 h-5 rounded flex items-center justify-center flex-shrink-0">
                        {file.id}
                      </span>
                      <span className="text-xs text-gray-300 font-medium">
                        {file.done ? '100%' : `${Math.round(file.progress)}%`}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 truncate mb-2">{file.name}</div>
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all duration-300 ${
                          file.done ? 'bg-green-400' : 'bg-blue-400'
                        }`}
                        style={{ width: `${file.done ? 100 : file.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Middle: Preview */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            {selectedFile ? (
              <>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button className="text-gray-400 hover:text-gray-600 text-sm">✏</button>
                    <button className="text-gray-400 hover:text-red-500 text-sm">🗑</button>
                  </div>
                </div>

                <div className="flex-1 bg-gray-900 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950" />
                  <div className="relative z-10 flex flex-col items-center gap-3 text-gray-500">
                    <div className="w-16 h-16 rounded-full bg-gray-700/60 flex items-center justify-center">
                      <span className="text-3xl">▶</span>
                    </div>
                    <span className="text-sm">视频预览</span>
                    <span className="text-xs text-gray-600">{selectedFile.size}</span>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-gray-700 bg-gray-800">
                  <div className="flex items-center gap-3">
                    <button className="text-white text-lg hover:text-blue-400 transition-colors">
                      ▶
                    </button>
                    <div className="flex-1 bg-gray-600 rounded-full h-1.5 cursor-pointer">
                      <div className="bg-blue-500 h-1.5 rounded-full w-0" />
                    </div>
                    <span className="text-xs text-gray-400 font-mono">0:00 / 24:30</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <span className="text-sm">请选择视频文件</span>
              </div>
            )}
          </div>

          {/* Right: Metadata + billing */}
          <div className="w-72 flex flex-col p-5 overflow-y-auto">
            <h3 className="font-semibold text-gray-800 mb-4">项目信息</h3>

            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  剧名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="请输入剧名"
                  value={title}
                  maxLength={50}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    error && !title.trim()
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                />
                <div className="text-right text-xs text-gray-400 mt-0.5">{title.length}/50</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">原始语言</label>
                <select
                  value={originalLanguage}
                  onChange={(e) => setOriginalLanguage(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400"
                >
                  <option value="zh-CN">中文（普通话）</option>
                  <option value="zh-TW">中文（粤语）</option>
                  <option value="en">英语</option>
                  <option value="ja">日语</option>
                  <option value="ko">韩语</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">备注</label>
                <textarea
                  placeholder="选填，如特殊要求、注意事项等..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 resize-none"
                />
              </div>

              {/* Billing info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600">💡</span>
                  <span className="text-xs font-semibold text-blue-800">算力消耗预估</span>
                </div>
                <div className="space-y-1 text-xs text-blue-700">
                  <div className="flex justify-between">
                    <span>视频解析 × {files.length} 集</span>
                    <span>8 点</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI 资产生成</span>
                    <span>4 点</span>
                  </div>
                  <div className="flex justify-between">
                    <span>角色识别</span>
                    <span>3 点</span>
                  </div>
                  <div className="flex justify-between font-semibold text-blue-900 pt-1 border-t border-blue-200">
                    <span>合计</span>
                    <span>15 点</span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!allDone || submitting}
              className={`mt-4 w-full py-3 rounded-lg text-sm font-semibold transition-all ${
                !allDone || submitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md active:scale-[0.99]'
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  提交中...
                </span>
              ) : !allDone ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span>⏳</span>
                  <span>视频上传中...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <span>✅</span>
                  <span>提交并开始解析 (预估消耗 15 算力点)</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
