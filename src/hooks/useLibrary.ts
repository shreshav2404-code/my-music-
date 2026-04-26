import { useEffect } from 'react';
import { runMigrations } from '../db/migrations';
import { useLibraryStore } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';
import { scanLocalFiles } from '../services/scanner';

export function useLibrary() {
  const store = useLibraryStore();

  useEffect(() => {
    runMigrations()
      .then(async () => {
        await store.loadFromDB();

        const settings = useSettingsStore.getState();
        const hasSongs = useLibraryStore.getState().songs.length > 0;

        if (settings.standaloneMode && settings.autoScanOnStartup && !hasSongs) {
          await scanLocalFiles();
          await store.loadFromDB();
        }
      })
      .catch((error) => {
        console.warn('Library initialization failed', error);
      });
  }, []);

  return store;
}
