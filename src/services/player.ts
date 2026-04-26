import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  State,
  Track,
  UpdateOptions,
} from 'react-native-track-player';
import { Track as WaveTrack } from '../types';

let isInitialized = false;

const updateOptions: UpdateOptions = {
  android: {
    appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
  },
  capabilities: [
    Capability.Play,
    Capability.Pause,
    Capability.Stop,
    Capability.SeekTo,
    Capability.SkipToNext,
    Capability.SkipToPrevious,
    Capability.SetRating,
  ],
  compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
};

function toPlayerTrack(track: WaveTrack): Track {
  const url = track.filePath?.startsWith('file://')
    ? track.filePath
    : track.filePath
      ? `file://${track.filePath}`
      : track.streamUrl || track.sourceUrl;

  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
    artwork: track.thumbnail,
    url,
  };
}

export async function setupPlayer(): Promise<void> {
  if (isInitialized) {
    return;
  }

  await TrackPlayer.setupPlayer({
    waitForBuffer: true,
    minBuffer: 10,
    maxBuffer: 50,
    playBuffer: 2.5,
    backBuffer: 5,
  });

  await TrackPlayer.updateOptions(updateOptions);
  isInitialized = true;
}

export async function playQueue(current: WaveTrack, queue: WaveTrack[]): Promise<void> {
  await setupPlayer();
  await TrackPlayer.reset();

  const playerQueue = [current, ...queue].map(toPlayerTrack);
  await TrackPlayer.add(playerQueue);
  await TrackPlayer.play();
}

export async function playSingle(track: WaveTrack): Promise<void> {
  await setupPlayer();
  await TrackPlayer.reset();
  await TrackPlayer.add(toPlayerTrack(track));
  await TrackPlayer.play();
}

export async function togglePlayback(): Promise<void> {
  const state = await TrackPlayer.getPlaybackState();

  if (state.state === State.Playing) {
    await TrackPlayer.pause();
    return;
  }

  await TrackPlayer.play();
}

export async function skipNext(): Promise<void> {
  await TrackPlayer.skipToNext();
}

export async function skipPrevious(): Promise<void> {
  const progress = await TrackPlayer.getProgress();
  if (progress.position > 3) {
    await TrackPlayer.seekTo(0);
    return;
  }

  await TrackPlayer.skipToPrevious();
}

export async function seekTo(seconds: number): Promise<void> {
  await TrackPlayer.seekTo(seconds);
}

export async function setPlayerVolume(volume: number): Promise<void> {
  await TrackPlayer.setVolume(volume);
}

export async function setPlayerRepeat(mode: 'off' | 'one' | 'all'): Promise<void> {
  let repeatMode = RepeatMode.Off;
  if (mode === 'one') {
    repeatMode = RepeatMode.Track;
  }
  if (mode === 'all') {
    repeatMode = RepeatMode.Queue;
  }
  await TrackPlayer.setRepeatMode(repeatMode);
}

export const PlayerEvents = Event;