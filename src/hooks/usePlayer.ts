import { useEffect } from 'react';
import { useProgress, useTrackPlayerEvents } from 'react-native-track-player';
import { PlayerEvents, setupPlayer } from '../services/player';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';

export function usePlayer() {
  const player = usePlayerStore();
  const progress = useProgress(1000);

  useEffect(() => {
    setupPlayer().catch(() => undefined);
  }, []);

  useEffect(() => {
    player.setPosition(progress.position, progress.duration);
  }, [progress.position, progress.duration]);

  useTrackPlayerEvents(
    [PlayerEvents.PlaybackActiveTrackChanged, PlayerEvents.PlaybackState, PlayerEvents.PlaybackQueueEnded],
    async (event) => {
      if (event.type === PlayerEvents.PlaybackState) {
        const isPlaying = event.state === 'playing';
        const isBuffering = event.state === 'buffering';
        usePlayerStore.getState().setPlayingState(isPlaying, isBuffering);
      }

      if (event.type === PlayerEvents.PlaybackActiveTrackChanged && event.track) {
        const track = useLibraryStore.getState().songs.find((item) => item.id === String(event.track));
        if (track) {
          usePlayerStore.getState().setCurrentTrack(track);
          await useLibraryStore.getState().markPlayed(track);
        }
      }

      if (event.type === PlayerEvents.PlaybackQueueEnded) {
        const repeatMode = usePlayerStore.getState().repeatMode;
        if (repeatMode === 'all') {
          const current = usePlayerStore.getState().currentTrack;
          const queue = usePlayerStore.getState().queue;
          if (current) {
            await usePlayerStore.getState().play(current, queue);
          }
        }
      }
    },
  );

  return player;
}