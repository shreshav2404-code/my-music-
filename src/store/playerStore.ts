import { create } from 'zustand';
import { RepeatMode, Track } from '../types';
import {
  playQueue,
  playSingle,
  seekTo as seekToPlayer,
  setPlayerRepeat,
  setPlayerVolume,
  skipNext,
  skipPrevious,
  togglePlayback,
} from '../services/player';

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  dynamicColor: string;
  sleepTimerEndAt: number | null;
  play: (track: Track, queue?: Track[]) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  skip: () => Promise<void>;
  previous: () => Promise<void>;
  addToQueue: (track: Track) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  reorderQueue: (nextQueue: Track[]) => void;
  shuffleQueue: () => void;
  setRepeat: (mode: RepeatMode) => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setPosition: (position: number, duration?: number) => void;
  setPlayingState: (isPlaying: boolean, isBuffering?: boolean) => void;
  setVolume: (volume: number) => Promise<void>;
  setDynamicColor: (color: string) => void;
  setCurrentTrack: (track: Track | null) => void;
  setSleepTimer: (endAt: number | null) => void;
}

function shuffled<T>(input: T[]): T[] {
  const copy = [...input];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  history: [],
  isPlaying: false,
  isBuffering: false,
  position: 0,
  duration: 0,
  volume: 1,
  isShuffle: false,
  repeatMode: 'off',
  dynamicColor: '#1DB954',
  sleepTimerEndAt: null,
  play: async (track, queue = []) => {
    await playQueue(track, queue);
    set((state) => ({
      currentTrack: track,
      queue,
      history: state.currentTrack ? [state.currentTrack, ...state.history].slice(0, 100) : state.history,
      isPlaying: true,
      duration: track.duration,
      position: 0,
    }));
  },
  pause: async () => {
    if (!get().currentTrack) {
      return;
    }
    await togglePlayback();
    set({ isPlaying: false });
  },
  resume: async () => {
    if (!get().currentTrack) {
      return;
    }
    await togglePlayback();
    set({ isPlaying: true });
  },
  skip: async () => {
    await skipNext();
  },
  previous: async () => {
    await skipPrevious();
  },
  addToQueue: (track) => {
    set((state) => ({ queue: [...state.queue, track] }));
  },
  removeFromQueue: (id) => {
    set((state) => ({ queue: state.queue.filter((track) => track.id !== id) }));
  },
  clearQueue: () => set({ queue: [] }),
  reorderQueue: (nextQueue) => set({ queue: nextQueue }),
  shuffleQueue: () => {
    set((state) => ({
      isShuffle: !state.isShuffle,
      queue: state.isShuffle ? state.queue : shuffled(state.queue),
    }));
  },
  setRepeat: async (mode) => {
    await setPlayerRepeat(mode);
    set({ repeatMode: mode });
  },
  seekTo: async (position) => {
    await seekToPlayer(position);
    set({ position });
  },
  setPosition: (position, duration) =>
    set((state) => ({
      position,
      duration: duration ?? state.duration,
    })),
  setPlayingState: (isPlaying, isBuffering = false) => set({ isPlaying, isBuffering }),
  setVolume: async (volume) => {
    await setPlayerVolume(volume);
    set({ volume });
  },
  setDynamicColor: (color) => set({ dynamicColor: color }),
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setSleepTimer: (endAt) => set({ sleepTimerEndAt: endAt }),
}));

export async function quickPlay(track: Track): Promise<void> {
  await playSingle(track);
  usePlayerStore.setState({
    currentTrack: track,
    queue: [],
    isPlaying: true,
    duration: track.duration,
    position: 0,
  });
}