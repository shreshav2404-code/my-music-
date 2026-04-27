import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { searchTracks } from '../services/api';
import { Track } from '../types';
import { mmkvStorage } from './mmkvStorage';

interface SearchState {
  query: string;
  sourceFilter: 'all' | 'youtube' | 'jamendo';
  isLoading: boolean;
  error: string | null;
  results: Track[];
  history: string[];
  trending: string[];
  setQuery: (value: string) => void;
  setSourceFilter: (value: SearchState['sourceFilter']) => void;
  search: (query: string) => Promise<void>;
  searchLocal: (query: string, songs: Track[]) => void;
  clearResults: () => void;
  clearHistory: () => void;
  setResults: (results: Track[]) => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      query: '',
      sourceFilter: 'all',
      isLoading: false,
      error: null,
      results: [],
      history: [],
      trending: ['Arijit Singh', 'Lo-fi Chill', 'Workout Mix', 'NCS', 'The Weeknd'],
      setQuery: (value) => set({ query: value }),
      setSourceFilter: (value) => set({ sourceFilter: value }),
      search: async (query) => {
        const normalized = query.trim();
        if (!normalized) {
          set({ results: [], query: '' });
          return;
        }

        set({ isLoading: true, error: null, query: normalized });

        try {
          const response = await searchTracks(normalized, get().sourceFilter);
          const history = [normalized, ...get().history.filter((entry) => entry !== normalized)].slice(0, 20);
          set({ results: response.results, isLoading: false, history });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Search failed',
          });
        }
      },
      searchLocal: (query, songs) => {
        const normalized = query.trim();
        if (!normalized) {
          set({ results: [], query: '', error: null });
          return;
        }

        const needle = normalized.toLowerCase();
        const history = [normalized, ...get().history.filter((entry) => entry !== normalized)].slice(0, 20);
        const localMatches = songs
          .filter((song) => {
            const title = song.title.toLowerCase();
            const artist = song.artist.toLowerCase();
            const album = song.album.toLowerCase();
            return title.includes(needle) || artist.includes(needle) || album.includes(needle);
          })
          .sort((a, b) => {
            const playedDiff = (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0);
            if (playedDiff !== 0) {
              return playedDiff;
            }
            return (b.playCount ?? 0) - (a.playCount ?? 0);
          });

        set({
          isLoading: false,
          error: null,
          query: normalized,
          results: localMatches,
          history,
        });
      },
      clearResults: () => set({ results: [], error: null }),
      clearHistory: () => set({ history: [] }),
      setResults: (results) => set({ results, error: null }),
    }),
    {
      name: 'wave-search',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ history: state.history, sourceFilter: state.sourceFilter }),
    },
  ),
);
