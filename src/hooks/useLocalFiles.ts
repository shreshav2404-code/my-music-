import { useState } from 'react';
import { scanLocalFiles } from '../services/scanner';
import { useLibraryStore } from '../store/libraryStore';

export function useLocalFiles() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');

  const scan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanStatus('Scanning storage');

    try {
      const count = await scanLocalFiles({
        onProgress: (percent, scanned, total) => {
          setScanProgress(percent);
          setScanStatus(`Scanned ${scanned}/${total}`);
        },
      });

      await useLibraryStore.getState().loadFromDB();
      setScanStatus(`Added ${count} songs`);
    } catch (error) {
      setScanStatus(error instanceof Error ? error.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  return {
    isScanning,
    scanProgress,
    scanStatus,
    scan,
  };
}