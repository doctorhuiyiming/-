import { useEffect } from 'react';
import type { SSEEvent } from '../types';

export function useSSE(
  projectId: string | null,
  onEvent: (event: SSEEvent) => void
) {
  useEffect(() => {
    if (!projectId) return;

    const es = new EventSource(`/api/v1/sse/${projectId}`);

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data) as SSEEvent;
        onEvent(parsed);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // SSE connection error, will auto-reconnect
    };

    return () => {
      es.close();
    };
  }, [projectId]);
}
