import { create } from 'zustand';
import { RepeatMode, Track } from '../types';
import {
  appendToQueue,
  clearUpcoming,
  getUpcomingTrackIds,
  insertNext,
  playQueue,
  removeQueuedTrack,
  replaceUpcoming,
  resolvePlayableTrack,
  seekTo as seekToPlayer,
  setPlayerRepeat,
  setPlayerVolume,
  skipNext,
  skipPrevious,
  skipToTrack,
  togglePlayback,
} from '../services/player';

interface PlayerState {
  currentTrack: Track | null;
  /** Tracks after the current one, in play order. */
  queue: Track[];
  history: Track[];
  isPlaying: boolean;
  isBuffering: boolean;
  /** Track whose stream is being resolved after the user tapped it. */
  loadingTrackId: string | null;
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
  addToQueue: (track: Track) => Promise<void>;
  playNext: (track: Track) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  reorderQueue: (nextQueue: Track[]) => Promise<void>;
  shuffleQueue: () => Promise<void>;
  skipTo: (id: string) => Promise<void>;
  syncQueue: () => Promise<void>;
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

// Every track handed to the native player, so queue ids can be mapped back.
const knownTracks = new Map<string, Track>();
function remember(tracks: Track[]): void {
  tracks.forEach((track) => knownTracks.set(track.id, track));
}

export function findKnownTrack(id: string): Track | undefined {
  return knownTracks.get(id);
}

// Upcoming order before shuffle was switched on, to restore it afterwards.
let unshuffledOrder: string[] = [];
// Only the most recent tap may start playback.
let playRequest = 0;

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  history: [],
  isPlaying: false,
  isBuffering: false,
  loadingTrackId: null,
  position: 0,
  duration: 0,
  volume: 1,
  isShuffle: false,
  repeatMode: 'off',
  dynamicColor: '#1DB954',
  sleepTimerEndAt: null,
  play: async (track, queue = []) => {
    const request = ++playRequest;
    set({ loadingTrackId: track.id });

    try {
      const playable = await resolvePlayableTrack(track);
      if (request !== playRequest) {
        return;
      }

      const upcoming = get().isShuffle ? shuffled(queue) : queue;
      unshuffledOrder = queue.map((entry) => entry.id);
      remember([playable, ...queue]);
      await playQueue(playable, upcoming);
      await setPlayerRepeat(get().repeatMode);

      set((state) => ({
        currentTrack: playable,
        queue: upcoming,
        history: state.currentTrack ? [state.currentTrack, ...state.history].slice(0, 100) : state.history,
        isPlaying: true,
        duration: playable.duration,
        position: 0,
      }));
    } finally {
      if (request === playRequest) {
        set({ loadingTrackId: null });
      }
    }
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
  addToQueue: async (track) => {
    if (!get().currentTrack) {
      await get().play(track, []);
      return;
    }
    remember([track]);
    await appendToQueue(track);
    unshuffledOrder.push(track.id);
    await get().syncQueue();
  },
  playNext: async (track) => {
    if (!get().currentTrack) {
      await get().play(track, []);
      return;
    }
    remember([track]);
    await insertNext(track);
    unshuffledOrder.unshift(track.id);
    await get().syncQueue();
  },
  removeFromQueue: async (id) => {
    await removeQueuedTrack(id);
    await get().syncQueue();
  },
  clearQueue: async () => {
    await clearUpcoming();
    set({ queue: [] });
  },
  reorderQueue: async (nextQueue) => {
    remember(nextQueue);
    await replaceUpcoming(nextQueue);
    set({ queue: nextQueue });
  },
  shuffleQueue: async () => {
    const { isShuffle, queue } = get();

    let nextQueue: Track[];
    if (isShuffle) {
      const order = new Map(unshuffledOrder.map((id, index) => [id, index]));
      nextQueue = [...queue].sort(
        (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      );
    } else {
      unshuffledOrder = queue.map((track) => track.id);
      nextQueue = shuffled(queue);
    }

    set({ isShuffle: !isShuffle, queue: nextQueue });
    if (get().currentTrack) {
      await replaceUpcoming(nextQueue);
    }
  },
  skipTo: async (id) => {
    if (!(await skipToTrack(id))) {
      const track = knownTracks.get(id);
      if (track) {
        await get().play(track, []);
      }
      return;
    }
    await get().syncQueue();
  },
  syncQueue: async () => {
    const ids = await getUpcomingTrackIds();
    set({
      queue: ids.map((id) => knownTracks.get(id)).filter((track): track is Track => !!track),
    });
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
      duration: duration || state.duration,
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
  await usePlayerStore.getState().play(track, []);
}
