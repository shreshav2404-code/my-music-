import TrackPlayer, { Event } from 'react-native-track-player';
import { ensureActiveTrackPlayable, retryActiveTrackAfterError } from './player';

export async function playbackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    await TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    await TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    await TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    await TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    await TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    await TrackPlayer.seekTo(event.position);
  });

  // Registered here rather than in a React hook so queued YouTube tracks keep
  // resolving while the app is in the background.
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async () => {
    await ensureActiveTrackPlayable();
  });

  TrackPlayer.addEventListener(Event.PlaybackError, async (event) => {
    console.warn('Playback error', event.code, event.message);
    await retryActiveTrackAfterError();
  });
}
