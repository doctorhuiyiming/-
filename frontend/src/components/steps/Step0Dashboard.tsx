import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { getProjects, updateProject as apiUpdateProject, deleteProject } from '../../api/client';
import StatusBadge from '../common/StatusBadge';
import type { Project, ProjectStatus } from '../../types';

const Step0Dashboard: React.FC = () => {
  const { projects, setProjects, setActiveTab, setActiveProjectId, updateProject } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getProjects();
        setProjects(res.data);
      } catch {
        setError('加载项目列表失败，请检查后端服务是否运行');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setProjects]);

  const handleRowClick = (project: Project) => {
    setActiveProjectId(project.id);
    const statusToTab: Partial<Record<ProjectStatus, string>> = {
      '待确认': '2',
      '生成中': '3',
      '部分失败': '3',
      '已完成': '5',
      '解析中': '2',
    };
    setActiveTab(statusToTab[project.status] ?? '2');
  };

  const handleNewProject = () => {
    setActiveTab('1');
  };

  const handleExport = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setActiveProjectId(project.id);
    setActiveTab('5');
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除该项目吗？此操作不可撤销。')) return;
    try {
      await deleteProject(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch {
      alert('删除失败，请重试');
    }
  };

  const startEditNote = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingNoteId(project.id);
    setEditingNotes((prev) => ({ ...prev, [project.id]: project.notes ?? '' }));
  };

  const saveNote = async (projectId: string) => {
    const newNote = editingNotes[projectId] ?? '';
    setEditingNoteId(null);
    try {
      await apiUpdateProject(projectId, { notes: newNote });
      updateProject(projectId, { notes: newNote });
    } catch {
      // silently fail note save
    }
  };

  const gradients = [
    'from-purple-600 to-pink-500',
    'from-blue-600 to-cyan-500',
    'from-orange-500 to-red-500',
    'from-green-600 to-teal-500',
    'from-indigo-600 to-purple-500',
  ];

  const getGradient = (id: string) => {
    const idx = id.charCodeAt(0) % gradients.length;
    return gradients[idx];
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="px-6 py-4 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工作台</h1>
          <p className="text-sm text-gray-500 mt-0.5">管理所有短剧翻拍项目</p>
        </div>
        <button
          onClick={handleNewProject}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
        >
          <span className="text-base">+</span>
          <span>新增剧集</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-500">加载项目列表...</span>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">🎬</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">还没有项目</h3>
          <p className="text-gray-500 text-sm mb-6">点击"新增剧集"开始您的第一个短剧翻拍项目</p>
          <button
            onClick={handleNewProject}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            + 新增剧集
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">剧名</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">状态</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">提取方式</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">目标属地</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">角色识别</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap min-w-32">备注</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">创建时间</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">更新时间</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => handleRowClick(project)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getGradient(project.id)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                        >
                          {project.title.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                            {project.title}
                          </div>
                          <div className="text-xs text-gray-400">{project.episode_count} 集</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{project.extract_method || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{project.target_region || '—'}</td>
                    <td className="px-4 py-3">
                      {project.has_character_recognition ? (
                        <span className="text-green-600 font-medium">✓ 是</span>
                      ) : (
                        <span className="text-gray-400">✗ 否</span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {editingNoteId === project.id ? (
                        <input
                          autoFocus
                          className="border border-blue-400 rounded px-2 py-0.5 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          value={editingNotes[project.id] ?? ''}
                          onChange={(e) =>
                            setEditingNotes((prev) => ({ ...prev, [project.id]: e.target.value }))
                          }
                          onBlur={() => saveNote(project.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveNote(project.id);
                            if (e.key === 'Escape') setEditingNoteId(null);
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-1 group/note">
                          <span className="text-gray-500 text-xs truncate max-w-28">
                            {project.notes || '—'}
                          </span>
                          <button
                            onClick={(e) => startEditNote(e, project)}
                            className="opacity-0 group-hover/note:opacity-100 text-gray-400 hover:text-blue-500 transition-all text-xs"
                          >
                            ✏
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(project.created_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(project.updated_at)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {project.status === '已完成' && (
                          <button
                            onClick={(e) => handleExport(e, project)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                          >
                            导出
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(e, project.id)}
                          className="text-red-400 hover:text-red-600 text-xs font-medium hover:underline"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
            共 {projects.length} 个项目
          </div>
        </div>
      )}
    </div>
  );
};

export default Step0Dashboard;
