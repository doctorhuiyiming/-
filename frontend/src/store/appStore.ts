import { create } from 'zustand';
import type { Project, Slice, AudioTrack } from '../types';

interface AppStore {
  activeTab: string;
  setActiveTab: (tab: string) => void;

  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;

  projects: Project[];
  setProjects: (projects: Project[]) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  addProject: (project: Project) => void;

  slices: Slice[];
  setSlices: (slices: Slice[]) => void;
  updateSlice: (id: string, data: Partial<Slice>) => void;

  audioTracks: AudioTrack[];
  setAudioTracks: (tracks: AudioTrack[]) => void;
  updateAudioTrack: (id: string, data: Partial<AudioTrack>) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeTab: '0',
  setActiveTab: (tab) => set({ activeTab: tab }),

  activeProjectId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),

  projects: [],
  setProjects: (projects) => set({ projects }),
  updateProject: (id, data) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...data } : p
      ),
    })),
  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),

  slices: [],
  setSlices: (slices) => set({ slices }),
  updateSlice: (id, data) =>
    set((state) => ({
      slices: state.slices.map((s) =>
        s.id === id ? { ...s, ...data } : s
      ),
    })),

  audioTracks: [],
  setAudioTracks: (tracks) => set({ audioTracks: tracks }),
  updateAudioTrack: (id, data) =>
    set((state) => ({
      audioTracks: state.audioTracks.map((t) =>
        t.id === id ? { ...t, ...data } : t
      ),
    })),
}));
