import TrackPlayer from 'react-native-track-player';
import { usePlayerStore } from '../store/playerStore';

let timeoutRef: ReturnType<typeof setTimeout> | null = null;
let fadeIntervalRef: ReturnType<typeof setInterval> | null = null;

export function cancelSleepTimer(): void {
  if (timeoutRef) {
    clearTimeout(timeoutRef);
    timeoutRef = null;
  }

  if (fadeIntervalRef) {
    clearInterval(fadeIntervalRef);
    fadeIntervalRef = null;
  }

  usePlayerStore.getState().setSleepTimer(null);
}

export function setSleepTimerMinutes(minutes: number): void {
  cancelSleepTimer();

  const endAt = Date.now() + minutes * 60_000;
  usePlayerStore.getState().setSleepTimer(endAt);

  timeoutRef = setTimeout(async () => {
    const fadeSteps = 10;
    const currentVolume = usePlayerStore.getState().volume;
    let step = 0;

    fadeIntervalRef = setInterval(async () => {
      step += 1;
      const nextVolume = Math.max(0, currentVolume * (1 - step / fadeSteps));
      await TrackPlayer.setVolume(nextVolume);

      if (step >= fadeSteps) {
        if (fadeIntervalRef) {
          clearInterval(fadeIntervalRef);
          fadeIntervalRef = null;
        }
        await TrackPlayer.pause();
        await TrackPlayer.setVolume(currentVolume);
        usePlayerStore.getState().setSleepTimer(null);
      }
    }, 1000);
  }, minutes * 60_000);
}

export function setSleepTimerEndOfTrack(): void {
  cancelSleepTimer();

  const { position, duration } = usePlayerStore.getState();
  const remainingSeconds = Math.max(1, duration - position);
  setSleepTimerMinutes(Math.ceil(remainingSeconds / 60));
}