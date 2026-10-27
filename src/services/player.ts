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
import {
  extractVideoId,
  getCachedYouTubeAudioUrl,
  invalidateYouTubeAudioUrl,
  resolveStreamByName,
  resolveYouTubeAudioUrl,
} from './api';

let setupPromise: Promise<void> | null = null;

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
  ],
  compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
};

// ─── Stream resolution ───────────────────────────────────────────────────────

function youtubeVideoId(track: { id?: string; sourceUrl?: string }): string | null {
  const fromUrl = extractVideoId(track.sourceUrl);
  if (fromUrl) return fromUrl;
  return track.id?.startsWith('yt_') ? track.id.slice(3) : null;
}

/**
 * Returns the track with a stream URL that is known to be fresh right now,
 * or with `streamUrl` cleared for YouTube tracks we haven't resolved yet.
 * YouTube links expire, so a `streamUrl` persisted in the DB is never trusted.
 */
function withKnownStream(track: WaveTrack): WaveTrack {
  if (track.filePath || track.source !== 'youtube') {
    return track;
  }
  const videoId = youtubeVideoId(track);
  return { ...track, streamUrl: (videoId && getCachedYouTubeAudioUrl(videoId)) || undefined };
}

/** Resolves a fresh, playable stream URL for any track. */
export async function resolvePlayableTrack(track: WaveTrack): Promise<WaveTrack> {
  if (track.filePath) {
    return track;
  }

  // Jamendo / archive give stable direct stream URLs.
  if (track.source !== 'youtube' && track.streamUrl) {
    return track;
  }

  const videoId = youtubeVideoId(track);
  if (videoId) {
    return { ...track, streamUrl: await resolveYouTubeAudioUrl(videoId) };
  }

  const resolved = await resolveStreamByName(`${track.title} ${track.artist}`, 'high');
  return { ...track, streamUrl: resolved.streamUrl, sourceUrl: resolved.sourceUrl };
}

function toPlayerTrack(track: WaveTrack): Track {
  const url = track.filePath?.startsWith('file://') || track.filePath?.startsWith('content://')
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
    sourceUrl: track.sourceUrl,
  };
}

const youtubePagePattern = /^https?:\/\/((www|m|music)\.)?(youtube\.com|youtu\.be)\//i;

/** A queued YouTube track whose URL is still the watch page, not an audio stream. */
function isUnresolved(item: Track): boolean {
  return typeof item.url === 'string' && youtubePagePattern.test(item.url);
}

async function resolvePlayerTrackUrl(item: Track): Promise<string> {
  const videoId = extractVideoId(String(item.sourceUrl ?? item.url));
  if (!videoId) {
    throw new Error('Track has no YouTube source');
  }
  return resolveYouTubeAudioUrl(videoId);
}

// ─── Setup ───────────────────────────────────────────────────────────────────

export function setupPlayer(): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      try {
        await TrackPlayer.setupPlayer({
          waitForBuffer: true,
          minBuffer: 10,
          maxBuffer: 50,
          playBuffer: 2.5,
          backBuffer: 5,
          // Pause for calls / other apps taking audio focus, resume afterwards.
          autoHandleInterruptions: true,
        });
      } catch (error) {
        // The native player outlives the JS context on Android (e.g. after a
        // reload), in which case it is already set up and usable.
        if ((error as { code?: string })?.code !== 'player_already_initialized') {
          throw error;
        }
      }
      await TrackPlayer.updateOptions(updateOptions);
    })().catch((error) => {
      setupPromise = null;
      throw error;
    });
  }
  return setupPromise;
}

// ─── Playback ────────────────────────────────────────────────────────────────

/** Starts `current` (must already be resolved) followed by `queue`. */
export async function playQueue(current: WaveTrack, queue: WaveTrack[]): Promise<void> {
  await setupPlayer();
  await TrackPlayer.reset();

  const playerQueue = [current, ...queue.map(withKnownStream)].map(toPlayerTrack);
  await TrackPlayer.add(playerQueue);
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

// ─── Queue ───────────────────────────────────────────────────────────────────

/** Ids of the tracks after the active one, in play order. */
export async function getUpcomingTrackIds(): Promise<string[]> {
  const [items, active] = await Promise.all([TrackPlayer.getQueue(), TrackPlayer.getActiveTrackIndex()]);
  return items.slice((active ?? -1) + 1).map((item) => String(item.id));
}

export async function appendToQueue(track: WaveTrack): Promise<void> {
  await TrackPlayer.add(toPlayerTrack(withKnownStream(track)));
  void prefetchNextTrack();
}

export async function insertNext(track: WaveTrack): Promise<void> {
  const active = await TrackPlayer.getActiveTrackIndex();
  await TrackPlayer.add(toPlayerTrack(withKnownStream(track)), (active ?? -1) + 1);
  void prefetchNextTrack();
}

export async function removeQueuedTrack(id: string): Promise<void> {
  const [items, active] = await Promise.all([TrackPlayer.getQueue(), TrackPlayer.getActiveTrackIndex()]);
  const indexes = items
    .map((item, index) => (String(item.id) === id && index !== active ? index : -1))
    .filter((index) => index >= 0);
  if (indexes.length > 0) {
    await TrackPlayer.remove(indexes);
  }
}

export async function clearUpcoming(): Promise<void> {
  await TrackPlayer.removeUpcomingTracks();
}

export async function replaceUpcoming(tracks: WaveTrack[]): Promise<void> {
  await TrackPlayer.removeUpcomingTracks();
  if (tracks.length > 0) {
    await TrackPlayer.add(tracks.map((track) => toPlayerTrack(withKnownStream(track))));
  }
  void prefetchNextTrack();
}

export async function skipToTrack(id: string): Promise<boolean> {
  const items = await TrackPlayer.getQueue();
  const index = items.findIndex((item) => String(item.id) === id);
  if (index < 0) {
    return false;
  }
  await TrackPlayer.skip(index);
  await TrackPlayer.play();
  return true;
}

// ─── Lazy resolution of queued YouTube tracks ────────────────────────────────

// Track ids currently being swapped to a resolved URL, so the prefetch and the
// active-track handler never both replace / reload the same track.
const resolving = new Set<string>();

/**
 * Queued YouTube tracks are added with their watch-page URL and resolved just
 * in time, so a 50-song album doesn't fire 50 stream lookups up front.
 */
export async function prefetchNextTrack(): Promise<void> {
  let claimed: string | null = null;
  try {
    const [items, active] = await Promise.all([TrackPlayer.getQueue(), TrackPlayer.getActiveTrackIndex()]);
    const next = items[(active ?? -1) + 1];
    if (!next || !isUnresolved(next) || resolving.has(String(next.id))) {
      return;
    }
    claimed = String(next.id);
    resolving.add(claimed);

    const url = await resolvePlayerTrackUrl(next);

    // The queue may have changed while we were resolving.
    const [fresh, activeNow] = await Promise.all([TrackPlayer.getQueue(), TrackPlayer.getActiveTrackIndex()]);
    const index = fresh.findIndex((item) => item.id === next.id);
    if (index < 0 || !isUnresolved(fresh[index])) {
      return;
    }

    if (index === activeNow) {
      await TrackPlayer.load({ ...fresh[index], url });
      await TrackPlayer.play();
      return;
    }

    await TrackPlayer.remove(index);
    await TrackPlayer.add({ ...fresh[index], url }, index);
  } catch (error) {
    console.warn('Prefetching next track failed', error);
  } finally {
    if (claimed) {
      resolving.delete(claimed);
    }
  }
}

/** Makes sure the active track has a real stream URL, then prefetches the next one. */
export async function ensureActiveTrackPlayable(): Promise<void> {
  let claimed: string | null = null;
  try {
    const active = await TrackPlayer.getActiveTrack();
    if (active && isUnresolved(active) && !resolving.has(String(active.id))) {
      claimed = String(active.id);
      resolving.add(claimed);
      const url = await resolvePlayerTrackUrl(active);
      const stillActive = await TrackPlayer.getActiveTrack();
      if (stillActive && stillActive.id === active.id && isUnresolved(stillActive)) {
        await TrackPlayer.load({ ...stillActive, url });
        await TrackPlayer.play();
      }
    }
  } catch (error) {
    console.warn('Resolving active track failed', error);
  } finally {
    if (claimed) {
      resolving.delete(claimed);
    }
  }

  await prefetchNextTrack();
}

const lastRetryAt = new Map<string, number>();

/** Resolved links can expire or be rejected; fetch a fresh one once and resume. */
export async function retryActiveTrackAfterError(): Promise<void> {
  const active = await TrackPlayer.getActiveTrack().catch(() => undefined);
  if (!active || isUnresolved(active)) {
    // Unresolved tracks are handled by ensureActiveTrackPlayable.
    return;
  }

  const videoId = extractVideoId(String(active.sourceUrl ?? ''));
  const id = String(active.id);
  const now = Date.now();
  if (!videoId || now - (lastRetryAt.get(id) ?? 0) < 60_000) {
    return;
  }
  lastRetryAt.set(id, now);

  try {
    const { position } = await TrackPlayer.getProgress();
    invalidateYouTubeAudioUrl(videoId);
    const url = await resolveYouTubeAudioUrl(videoId);
    await TrackPlayer.load({ ...active, url });
    if (position > 0) {
      await TrackPlayer.seekTo(position);
    }
    await TrackPlayer.play();
  } catch (error) {
    console.warn('Retrying track after playback error failed', error);
  }
}

export const PlayerEvents = Event;
