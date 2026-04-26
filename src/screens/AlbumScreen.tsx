import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SongList } from '../components/library/SongList';
import { getAlbumSongs } from '../db/queries/albums';
import { RootStackParamList } from '../navigation/types';
import { useDownloadStore } from '../store/downloadStore';
import { usePlayerStore } from '../store/playerStore';
import { Track } from '../types';

export function AlbumScreen({ route }: NativeStackScreenProps<RootStackParamList, 'Album'>) {
  const [songs, setSongs] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const play = usePlayerStore((state) => state.play);
  const download = useDownloadStore((state) => state.startDownload);

  useEffect(() => {
    setIsLoading(true);
    getAlbumSongs(route.params.albumName, route.params.artist)
      .then((rows) => {
        setSongs(rows);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load album'))
      .finally(() => setIsLoading(false));
  }, [route.params.albumName, route.params.artist]);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.params.albumName}</Text>
      <Text style={styles.subtitle}>{route.params.artist}</Text>
      <SongList songs={songs} onPlay={(song) => play(song, songs.filter((entry) => entry.id !== song.id))} onDownload={(song) => download(song, 320)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingTop: 56,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 14,
    paddingHorizontal: 16,
    marginTop: 2,
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
});