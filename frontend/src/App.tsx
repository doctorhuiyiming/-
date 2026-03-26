import React, { useCallback } from 'react';
import { useAppStore } from './store/appStore';
import { useSSE } from './hooks/useSSE';
import type { SSEEvent } from './types';
import Header from './components/layout/Header';
import TabNav from './components/layout/TabNav';
import Step0Dashboard from './components/steps/Step0Dashboard';
import Step1Upload from './components/steps/Step1Upload';
import Step2AssetReview from './components/steps/Step2AssetReview';
import Step3CardConsole from './components/steps/Step3CardConsole';
import Step4AudioVideo from './components/steps/Step4AudioVideo';
import Step5Export from './components/steps/Step5Export';

const App: React.FC = () => {
  const { activeTab, activeProjectId, updateProject, updateSlice } = useAppStore();

  const handleSSEEvent = useCallback(
    (event: SSEEvent) => {
      if (event.type === 'status_update') {
        const data = event.data as { status?: string };
        if (event.project_id && data.status) {
          updateProject(event.project_id, { status: data.status as import('./types').ProjectStatus });
        }
      } else if (event.type === 'slice_update') {
        const data = event.data as { slice_id?: string; status?: string; vbench_score?: number; video_url?: string; error_message?: string };
        if (data.slice_id) {
          updateSlice(data.slice_id, {
            status: data.status as import('./types').SliceStatus,
            vbench_score: data.vbench_score ?? null,
            ai_video_url: data.video_url ?? null,
            error_message: data.error_message ?? null,
          });
        }
      }
    },
    [updateProject, updateSlice]
  );

  useSSE(activeProjectId, handleSSEEvent);

  const renderTabContent = () => {
    switch (activeTab) {
      case '0':
        return <Step0Dashboard />;
      case '1':
        return <Step1Upload />;
      case '2':
        return <Step2AssetReview />;
      case '3':
        return <Step3CardConsole />;
      case '4':
        return <Step4AudioVideo />;
      case '5':
        return <Step5Export />;
      default:
        return <Step0Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <TabNav />
      <main className="pt-28">
        {renderTabContent()}
      </main>
    </div>
  );
};

export default App;
