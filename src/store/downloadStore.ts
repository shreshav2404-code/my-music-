import { create } from 'zustand';
import { DownloadItem, Track } from '../types';
import { startDownload } from '../services/downloader';
import { useLibraryStore } from './libraryStore';
import { setDownloaded, upsertSong } from '../db/queries/songs';

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
      const result = await startDownload(
        {
          url: song.sourceUrl,
          quality,
          filename: `${song.title} - ${song.artist}`,
        },
        {
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
        },
      );

      const downloadedTrack: Track = {
        ...song,
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
    set((state) => ({
      activeDownloads: state.activeDownloads.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              status: 'cancelled',
            }
          : entry,
      ),
    }));
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