import axios from 'axios';
import type { Project, Asset, Slice, AudioTrack } from '../types';

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Projects
export const getProjects = () => client.get<Project[]>('/v1/projects');
export const createProject = (data: {
  title: string;
  original_language: string;
  target_region: string;
  notes?: string;
}) => client.post<Project>('/v1/projects', data);
export const updateProject = (id: string, data: Partial<Project>) =>
  client.patch<Project>(`/v1/projects/${id}`, data);
export const deleteProject = (id: string) =>
  client.delete(`/v1/projects/${id}`);

// Assets
export const getAssets = (projectId: string) =>
  client.get<Asset[]>(`/v1/projects/${projectId}/assets`);
export const updateAsset = (assetId: string, data: Partial<Asset>) =>
  client.patch<Asset>(`/v1/assets/${assetId}`, data);
export const confirmAssets = (projectId: string) =>
  client.post(`/v1/projects/${projectId}/confirm-assets`);

// Slices
export const getSlices = (projectId: string) =>
  client.get<Slice[]>(`/v1/projects/${projectId}/slices`);
export const updateSlice = (sliceId: string, data: Partial<Slice>) =>
  client.patch<Slice>(`/v1/slices/${sliceId}`, data);
export const generateGroup = (data: {
  slice_ids: string[];
  prompts: Record<string, string>;
}) => client.post('/v1/video/generate/group', data);
export const adoptTask = (sliceId: string, taskId: string) =>
  client.post(`/v1/slices/${sliceId}/adopt/${taskId}`);

// Audio
export const getAudioTracks = (projectId: string) =>
  client.get<AudioTrack[]>(`/v1/projects/${projectId}/audio-tracks`);
export const updateAudioTrack = (trackId: string, data: Partial<AudioTrack>) =>
  client.patch<AudioTrack>(`/v1/audio-tracks/${trackId}`, data);

// Export
export const exportProject = (data: {
  project_id: string;
  export_mode: 'full_video' | 'raw_assets';
  video_tracks?: { slice_id: string; task_id: string }[];
  audio_tracks?: { track_id: string; offset_ms: number }[];
}) => client.post('/v1/project/export', data);

// Upload
export const uploadFile = (formData: FormData) =>
  client.post('/v1/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export default client;
