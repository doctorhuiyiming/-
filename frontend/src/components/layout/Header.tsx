import React, { useState } from 'react';

const Header: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white h-14 flex items-center px-6 shadow-lg">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎬</span>
          <span className="font-bold text-lg tracking-tight">短剧翻拍</span>
          <span className="text-gray-400 text-sm ml-1">重制工厂</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索项目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-800 text-white placeholder-gray-500 rounded-lg px-4 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            ⌕
          </span>
        </div>

        <button className="text-sm text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
          <span>📖</span>
          <span>使用教程</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold cursor-pointer hover:bg-blue-500 transition-colors">
          U
        </div>
      </div>
    </header>
  );
};

export default Header;
