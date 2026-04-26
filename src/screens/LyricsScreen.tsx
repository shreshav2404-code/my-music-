import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getLyrics } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { usePlayerStore } from '../store/playerStore';

type LrcLine = {
  timestamp: number;
  text: string;
};

function parseLrc(lrc: string): LrcLine[] {
  const lines = lrc.split(/\r?\n/);
  const parsed: LrcLine[] = [];

  for (const rawLine of lines) {
    const match = rawLine.match(/^\[(\d{2}):(\d{2})(?:\.(\d{2}))?\]\s*(.*)$/);
    if (!match) {
      continue;
    }

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const centiseconds = Number(match[3] ?? 0);
    const timestamp = minutes * 60 + seconds + centiseconds / 100;
    parsed.push({ timestamp, text: match[4] });
  }

  return parsed;
}

export function LyricsScreen({ route }: NativeStackScreenProps<RootStackParamList, 'Lyrics'>) {
  const position = usePlayerStore((state) => state.position);

  const [plainLyrics, setPlainLyrics] = useState(route.params.track.lyrics ?? '');
  const [syncedLyrics, setSyncedLyrics] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getLyrics(route.params.track.title, route.params.track.artist)
      .then((payload) => {
        setPlainLyrics(payload.plain || 'Lyrics unavailable');
        setSyncedLyrics(payload.synced || '');
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load lyrics'))
      .finally(() => setIsLoading(false));
  }, [route.params.track.title, route.params.track.artist]);

  const lrcLines = useMemo(() => parseLrc(syncedLyrics), [syncedLyrics]);

  const activeIndex = useMemo(() => {
    if (lrcLines.length === 0) {
      return -1;
    }

    let index = 0;
    for (let i = 0; i < lrcLines.length; i += 1) {
      if (position >= lrcLines[i].timestamp) {
        index = i;
      }
    }
    return index;
  }, [position, lrcLines]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1DB954" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (lrcLines.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.plain}>{plainLyrics || 'Lyrics unavailable'}</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {lrcLines.map((line, index) => (
        <Text key={`${line.timestamp}_${index}`} style={[styles.syncedLine, index === activeIndex && styles.activeLine]}>
          {line.text || '♪'}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 10,
  },
  center: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#FF4444',
  },
  plain: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 27,
  },
  syncedLine: {
    color: '#7A7A7A',
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '600',
  },
  activeLine: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '800',
  },
});