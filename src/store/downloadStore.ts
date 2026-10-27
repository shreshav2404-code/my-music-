import { create } from 'zustand';
import { DownloadItem, Track } from '../types';
import { cancelDownloadJob, DownloadCancelledError, startDownload } from '../services/downloader';
import { useLibraryStore } from './libraryStore';
import { getSongById, setDownloaded, upsertSong } from '../db/queries/songs';

interface DownloadState {
  activeDownloads: DownloadItem[];
  completedDownloads: Track[];
  startDownload: (song: Track, quality: number) => Promise<void>;
  cancelDownload: (id: string) => void;
  retryDownload: (id: string, quality: number) => Promise<void>;
  clearCompleted: () => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  activeDownloads: [],
  completedDownloads: [],
  startDownload: async (song, quality) => {
    // Search results don't know whether a song is already on the device.
    const stored = useLibraryStore.getState().songs.find((entry) => entry.id === song.id);
    if (stored?.isDownloaded && stored.filePath) {
      return;
    }
    const alreadyRunning = get().activeDownloads.some(
      (entry) => entry.song.id === song.id && entry.status !== 'error' && entry.status !== 'cancelled',
    );
    if (alreadyRunning) {
      return;
    }

    const id = `${song.id}_${Date.now()}`;
    const item: DownloadItem = {
      id,
      song,
      progress: 0,
      status: 'queued',
      eta: null,
    };

    set((state) => ({ activeDownloads: [...state.activeDownloads, item] }));

    try {
      const result = await startDownload(song, {
        jobId: id,
        onProgress: (payload) => {
          set((state) => ({
            activeDownloads: state.activeDownloads.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    progress: payload.percent,
                    status: payload.status as DownloadItem['status'],
                    eta: payload.eta,
                    message: payload.message,
                  }
                : entry,
            ),
          }));
        },
      });

      // Keep likes / play counts of a song that's already in the library.
      const existing = await getSongById(song.id);
      const downloadedTrack: Track = {
        ...song,
        ...existing,
        filePath: result.fileUri,
        isDownloaded: true,
        quality: String(quality),
      };

      await upsertSong(downloadedTrack);
      await setDownloaded(song.id, result.fileUri, String(quality));
      await useLibraryStore.getState().loadFromDB();

      set((state) => ({
        activeDownloads: state.activeDownloads.filter((entry) => entry.id !== id),
        completedDownloads: [downloadedTrack, ...state.completedDownloads],
      }));
    } catch (error) {
      if (error instanceof DownloadCancelledError) {
        set((state) => ({ activeDownloads: state.activeDownloads.filter((entry) => entry.id !== id) }));
        return;
      }

      set((state) => ({
        activeDownloads: state.activeDownloads.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                status: 'error',
                message: error instanceof Error ? error.message : 'Download failed',
              }
            : entry,
        ),
      }));
    }
  },
  cancelDownload: (id) => {
    const target = get().activeDownloads.find((entry) => entry.id === id);
    if (!target) {
      return;
    }

    // Failed downloads have nothing running; just dismiss them.
    if (target.status === 'error' || target.status === 'cancelled') {
      set((state) => ({ activeDownloads: state.activeDownloads.filter((entry) => entry.id !== id) }));
      return;
    }

    set((state) => ({
      activeDownloads: state.activeDownloads.map((entry) =>
        entry.id === id ? { ...entry, status: 'cancelled', message: 'Cancelling...' } : entry,
      ),
    }));
    void cancelDownloadJob(id);
  },
  retryDownload: async (id, quality) => {
    const failed = get().activeDownloads.find((entry) => entry.id === id);
    if (!failed) {
      return;
    }

    set((state) => ({
      activeDownloads: state.activeDownloads.filter((entry) => entry.id !== id),
    }));

    await get().startDownload(failed.song, quality);
  },
  clearCompleted: () => set({ completedDownloads: [] }),
}));
