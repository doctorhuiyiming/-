import React, { useState, useCallback } from 'react';
import UploadModal from './UploadModal';

interface StyleCard {
  id: string;
  title: string;
  subtitle: string;
  region: string;
  gradient: string;
  flag: string;
  stats: { label: string; value: string }[];
}

const STYLE_CARDS: StyleCard[] = [
  {
    id: 'western',
    title: '欧美 / 英语',
    subtitle: 'Western / English',
    region: '欧美/英语',
    gradient: 'from-blue-900 via-blue-700 to-indigo-600',
    flag: '🇺🇸',
    stats: [
      { label: '平均时长', value: '45 分/集' },
      { label: '主要市场', value: 'Netflix / Amazon' },
      { label: '翻拍案例', value: '128 部' },
    ],
  },
  {
    id: 'latam',
    title: '拉美 / 西班牙语',
    subtitle: 'Latin America / Spanish',
    region: '拉美/西班牙语',
    gradient: 'from-orange-700 via-red-600 to-yellow-600',
    flag: '🇲🇽',
    stats: [
      { label: '平均时长', value: '60 分/集' },
      { label: '主要市场', value: 'Telemundo / Univision' },
      { label: '翻拍案例', value: '94 部' },
    ],
  },
];

const Step1Upload: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [presetRegion, setPresetRegion] = useState<string | undefined>(undefined);
  const [dragOver, setDragOver] = useState(false);

  const handleOpenModal = (region?: string) => {
    setPresetRegion(region);
    setShowModal(true);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleOpenModal();
  }, []);

  return (
    <div className="px-6 py-4 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Step 1 — 创建与预处理</h1>
        <p className="text-sm text-gray-500 mt-0.5">上传原始短剧视频，选择目标国家/地区，开始解析</p>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => handleOpenModal()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all mb-8
          ${dragOver
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'
          }
        `}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
            dragOver ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <span className="text-4xl">📁</span>
          </div>
          <div>
            <h3 className={`text-lg font-semibold mb-1 transition-colors ${
              dragOver ? 'text-blue-700' : 'text-gray-700'
            }`}>
              {dragOver ? '松开鼠标上传视频' : '点击或拖拽视频到此处'}
            </h3>
            <p className="text-sm text-gray-400">
              支持 MP4、MOV、AVI 格式，单文件最大 2GB
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenModal(); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            选择文件上传
          </button>
        </div>

        {/* Decorative corner elements */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-gray-300 rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-gray-300 rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-gray-300 rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-gray-300 rounded-br-lg" />
      </div>

      {/* Style cards section */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800 mb-1">选择目标国家/地区</h2>
        <p className="text-sm text-gray-500">选择翻拍目标市场，AI 将根据当地审美偏好调整角色设定与场景风格</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {STYLE_CARDS.map((card) => (
          <div
            key={card.id}
            className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 group cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            {/* Card cover */}
            <div
              className={`relative h-48 bg-gradient-to-br ${card.gradient} overflow-hidden`}
            >
              {/* Decorative background elements */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 right-4 text-8xl opacity-30">{card.flag}</div>
                <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5" />
              </div>

              <div className="relative z-10 p-5">
                <span className="text-4xl">{card.flag}</span>
                <div className="mt-3">
                  <h3 className="text-white font-bold text-xl">{card.title}</h3>
                  <p className="text-white/70 text-sm">{card.subtitle}</p>
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-3xl mb-2">▶</div>
                  <div className="text-sm font-medium">播放翻拍案例...</div>
                </div>
              </div>
            </div>

            {/* Card body */}
            <div className="bg-white p-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {card.stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-sm font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleOpenModal(card.region)}
                className="w-full bg-gray-900 hover:bg-gray-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>开始解析</span>
                <span className="text-base">→</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tips section */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-amber-500 text-lg flex-shrink-0">💡</span>
          <div>
            <h4 className="text-sm font-semibold text-amber-800 mb-1">使用提示</h4>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>建议上传连续剧集，系统将自动识别角色和场景连续性</li>
              <li>视频分辨率越高，AI 角色识别准确率越好（推荐 1080p 以上）</li>
              <li>解析过程预计需要 3-10 分钟，完成后可在工作台查看结果</li>
            </ul>
          </div>
        </div>
      </div>

      {showModal && (
        <UploadModal
          targetRegion={presetRegion}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default Step1Upload;
