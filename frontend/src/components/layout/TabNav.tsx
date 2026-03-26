import React from 'react';
import { useAppStore } from '../../store/appStore';

interface Tab {
  id: string;
  icon: string;
  label: string;
  sublabel?: string;
}

const tabs: Tab[] = [
  { id: '0', icon: '🏠', label: '首页', sublabel: '工作台' },
  { id: '1', icon: '📁', label: 'Step 1', sublabel: '创建与预处理' },
  { id: '2', icon: '🔍', label: 'Step 2', sublabel: '资产解析(需求期)' },
  { id: '3', icon: '🃏', label: 'Step 3', sublabel: '抽卡控制台(制作期)' },
  { id: '4', icon: '🎵', label: 'Step 4', sublabel: '音视频校对' },
  { id: '5', icon: '📦', label: 'Step 5', sublabel: '资产导出' },
];

const TabNav: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-stretch overflow-x-auto">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all
                ${isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300'
                }
              `}
            >
              <span className="text-base">{tab.icon}</span>
              <div className="text-left">
                <div className={`font-semibold text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {tab.label}
                </div>
                <div className={`text-xs ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                  {tab.sublabel}
                </div>
              </div>
              {index < tabs.length - 1 && (
                <span className="ml-2 text-gray-300">›</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabNav;
