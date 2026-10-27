import { useEffect } from 'react';
import { runMigrations } from '../db/migrations';
import { useLibraryStore } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';
import { scanLocalFiles } from '../services/scanner';

/** Loads the library on startup. Doesn't subscribe to the store. */
export function useLibrary(): void {
  useEffect(() => {
    const { loadFromDB } = useLibraryStore.getState();

    runMigrations()
      .then(async () => {
        await loadFromDB();

        const settings = useSettingsStore.getState();
        const hasSongs = useLibraryStore.getState().songs.length > 0;

        if (settings.autoScanOnStartup && !hasSongs) {
          await scanLocalFiles();
          await loadFromDB();
        }
      })
      .catch((error) => {
        console.warn('Library initialization failed', error);
      });
  }, []);
}
