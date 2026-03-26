export type ProjectStatus = '解析中' | '待确认' | '生成中' | '部分失败' | '已完成';
export type SliceStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface Project {
  id: string;
  title: string;
  original_language: string;
  target_region: string;
  extract_method: string;
  has_character_recognition: boolean;
  status: ProjectStatus;
  notes: string | null;
  episode_count: number;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  project_id: string;
  asset_type: 'character' | 'scene' | 'prop';
  original_name: string;
  original_description: string;
  original_image_url: string | null;
  new_name: string | null;
  new_description: string | null;
  new_image_url: string | null;
  is_confirmed: boolean;
}

export interface Dialogue {
  speaker: string;
  text: string;
  translated: string;
}

export interface GenerationTask {
  id: string;
  slice_id: string;
  prompt: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  video_url: string | null;
  vbench_score: number | null;
  error_message: string | null;
  created_at: string;
}

export interface Slice {
  id: string;
  project_id: string;
  slice_index: string;
  time_start: string;
  time_end: string;
  original_description: string;
  original_dialogue: Dialogue[];
  ai_video_url: string | null;
  ai_description: string | null;
  prompt: string | null;
  status: SliceStatus;
  vbench_score: number | null;
  adopted_task_id: string | null;
  error_message: string | null;
  tasks: GenerationTask[];
}

export interface AudioTrack {
  id: string;
  project_id: string;
  track_type: 'translated_voice' | 'original_voice' | 'bgm';
  asset_url: string | null;
  offset_ms: number;
  is_muted: boolean;
  label: string | null;
}

export interface SSEEvent {
  type: 'status_update' | 'slice_update' | 'export_ready';
  project_id: string;
  data: Record<string, unknown>;
}
