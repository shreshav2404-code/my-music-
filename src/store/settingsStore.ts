import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from './mmkvStorage';

interface SettingsState {
  streamQuality: 'low' | 'normal' | 'high';
  downloadQuality: 128 | 192 | 320;
  sourcePriority: string[];
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  crossfadeDuration: number;
  normalizeVolume: boolean;
  downloadOnWifiOnly: boolean;
  equalizerPreset: string;
  equalizerBands: number[];
  autoScanOnStartup: boolean;
  albumArtBlurIntensity: number;
  lyricsOnLockScreen: boolean;
  sourcesEnabled: Record<string, boolean>;
  setStreamQuality: (value: SettingsState['streamQuality']) => void;
  setDownloadQuality: (value: SettingsState['downloadQuality']) => void;
  setTheme: (value: SettingsState['theme']) => void;
  setAccentColor: (value: string) => void;
  setCrossfadeDuration: (value: number) => void;
  toggleNormalizeVolume: () => void;
  toggleWifiOnly: () => void;
  setSourcePriority: (value: string[]) => void;
  toggleSource: (source: string) => void;
  setEqualizerPreset: (preset: string, bands?: number[]) => void;
  setEqualizerBands: (bands: number[]) => void;
  setAutoScanOnStartup: (value: boolean) => void;
  setAlbumArtBlurIntensity: (value: number) => void;
  setLyricsOnLockScreen: (value: boolean) => void;

  // Legacy compat — always returns false now
  standaloneMode: boolean;
  backendUrl: string;
  setStandaloneMode: (value: boolean) => void;
  setBackendUrl: (value: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      standaloneMode: false,
      backendUrl: '',
      streamQuality: 'high',
      downloadQuality: 320,
      sourcePriority: ['youtube', 'jamendo', 'local'],
      theme: 'dark',
      accentColor: '#1DB954',
      crossfadeDuration: 0,
      normalizeVolume: false,
      downloadOnWifiOnly: false,
      equalizerPreset: 'Normal',
      equalizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      autoScanOnStartup: true,
      albumArtBlurIntensity: 40,
      lyricsOnLockScreen: true,
      sourcesEnabled: {
        youtube: true,
        jamendo: true,
        local: true,
      },
      setStreamQuality: (value) => set({ streamQuality: value }),
      setDownloadQuality: (value) => set({ downloadQuality: value }),
      setBackendUrl: (_value) => {},
      setTheme: (value) => set({ theme: value }),
      setAccentColor: (value) => set({ accentColor: value }),
      setCrossfadeDuration: (value) => set({ crossfadeDuration: value }),
      toggleNormalizeVolume: () => set({ normalizeVolume: !get().normalizeVolume }),
      toggleWifiOnly: () => set({ downloadOnWifiOnly: !get().downloadOnWifiOnly }),
      setSourcePriority: (value) => set({ sourcePriority: value }),
      toggleSource: (source) => {
        const enabled = { ...get().sourcesEnabled };
        enabled[source] = !enabled[source];
        set({ sourcesEnabled: enabled });
      },
      setEqualizerPreset: (preset, bands) =>
        set({
          equalizerPreset: preset,
          equalizerBands: bands ?? get().equalizerBands,
        }),
      setEqualizerBands: (bands) => set({ equalizerBands: bands }),
      setAutoScanOnStartup: (value) => set({ autoScanOnStartup: value }),
      setAlbumArtBlurIntensity: (value) => set({ albumArtBlurIntensity: value }),
      setLyricsOnLockScreen: (value) => set({ lyricsOnLockScreen: value }),
      setStandaloneMode: (_value) => {},
    }),
    {
      name: 'wave-settings',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        streamQuality: state.streamQuality,
        downloadQuality: state.downloadQuality,
        sourcePriority: state.sourcePriority,
        theme: state.theme,
        accentColor: state.accentColor,
        crossfadeDuration: state.crossfadeDuration,
        normalizeVolume: state.normalizeVolume,
        downloadOnWifiOnly: state.downloadOnWifiOnly,
        equalizerPreset: state.equalizerPreset,
        equalizerBands: state.equalizerBands,
        autoScanOnStartup: state.autoScanOnStartup,
        albumArtBlurIntensity: state.albumArtBlurIntensity,
        lyricsOnLockScreen: state.lyricsOnLockScreen,
        sourcesEnabled: state.sourcesEnabled,
      }),
    },
  ),
);
