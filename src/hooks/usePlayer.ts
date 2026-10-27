import { useEffect } from 'react';
import { useProgress, useTrackPlayerEvents } from 'react-native-track-player';
import { PlayerEvents, setupPlayer } from '../services/player';
import { useLibraryStore } from '../store/libraryStore';
import { findKnownTrack, usePlayerStore } from '../store/playerStore';

/**
 * Keeps the player store in sync with the native player. Render it from a
 * component that returns nothing: progress updates re-render it every second.
 */
export function usePlayer(): void {
  const progress = useProgress(1000);

  useEffect(() => {
    setupPlayer().catch((error) => console.warn('Player setup failed', error));
  }, []);

  useEffect(() => {
    usePlayerStore.getState().setPosition(progress.position, progress.duration);
  }, [progress.position, progress.duration]);

  useTrackPlayerEvents(
    [PlayerEvents.PlaybackActiveTrackChanged, PlayerEvents.PlaybackState],
    async (event) => {
      if (event.type === PlayerEvents.PlaybackState) {
        const isPlaying = event.state === 'playing';
        const isBuffering = event.state === 'buffering' || event.state === 'loading';
        usePlayerStore.getState().setPlayingState(isPlaying, isBuffering);
      }

      if (event.type === PlayerEvents.PlaybackActiveTrackChanged && event.track) {
        const id = String(event.track.id);
        const track = findKnownTrack(id) ?? useLibraryStore.getState().songs.find((item) => item.id === id);
        if (track) {
          usePlayerStore.getState().setCurrentTrack(track);
          await useLibraryStore.getState().markPlayed(track);
        }
        await usePlayerStore.getState().syncQueue();
      }
    },
  );
}
