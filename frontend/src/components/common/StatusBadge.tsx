import React from 'react';
import type { ProjectStatus } from '../../types';

interface StatusBadgeProps {
  status: ProjectStatus;
}

const statusConfig: Record<
  ProjectStatus,
  { label: string; className: string; pulse?: boolean }
> = {
  已完成: {
    label: '已完成',
    className: 'bg-green-100 text-green-800 border border-green-200',
  },
  解析中: {
    label: '解析中',
    className: 'bg-blue-100 text-blue-800 border border-blue-200',
    pulse: true,
  },
  待确认: {
    label: '待确认',
    className: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  },
  生成中: {
    label: '生成中',
    className: 'bg-blue-100 text-blue-800 border border-blue-200',
    pulse: true,
  },
  部分失败: {
    label: '部分失败',
    className: 'bg-red-100 text-red-800 border border-red-200',
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-800 border border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
      )}
      {config.label}
    </span>
  );
};

export default StatusBadge;
