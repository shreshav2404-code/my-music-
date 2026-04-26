export const palette = {
  background: '#0A0A0A',
  surface: '#141414',
  elevated: '#1E1E1E',
  border: '#2A2A2A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#606060',
  accent: '#1DB954',
  danger: '#FF4444',
  success: '#1DB954',
  youtube: '#FF3B30',
  soundcloud: '#FF9500',
  jamendo: '#2ECC71',
  archive: '#4DA3FF',
  local: '#4DA3FF',
};

export const gradients = {
  morning: ['#8F4E0B', '#2A1200', '#0A0A0A'],
  evening: ['#4A1C5A', '#180B2C', '#0A0A0A'],
  night: ['#0D1B3A', '#0B1022', '#050505'],
};

export function sourceColor(source: string): string {
  switch (source) {
    case 'youtube':
      return palette.youtube;
    case 'soundcloud':
      return palette.soundcloud;
    case 'jamendo':
      return palette.jamendo;
    case 'archive':
      return palette.archive;
    default:
      return palette.local;
  }
}