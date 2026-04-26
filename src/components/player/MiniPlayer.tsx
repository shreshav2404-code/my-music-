import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCurrentRouteName, navigateToNowPlaying, navigationRef } from '../../navigation/navigationRef';
import { usePlayerStore } from '../../store/playerStore';
import { useSettingsStore } from '../../store/settingsStore';

export function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    pause,
    resume,
    skip,
  } = usePlayerStore();
  const accentColor = useSettingsStore((state) => state.accentColor);

  const [routeName, setRouteName] = useState(getCurrentRouteName());

  useEffect(() => {
    const syncRoute = () => setRouteName(getCurrentRouteName());
    syncRoute();

    const unsubscribe = navigationRef.addListener('state', syncRoute);
    return unsubscribe;
  }, []);

  if (!currentTrack) {
    return null;
  }

  if (routeName === 'NowPlaying') {
    return null;
  }

  const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <TouchableOpacity style={styles.container} onPress={navigateToNowPlaying}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
      </View>

      <Image source={{ uri: currentTrack.thumbnail }} style={styles.cover} contentFit="cover" cachePolicy="memory-disk" />

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentTrack.artist}
        </Text>
      </View>

      <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#FFFFFF12' }]} onPress={isPlaying ? pause : resume}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#FFFFFF12' }]} onPress={skip}>
        <Ionicons name="play-skip-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 70,
    left: 10,
    right: 10,
    height: 66,
    borderRadius: 16,
    backgroundColor: '#131313',
    borderColor: '#262626',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
    zIndex: 30,
    overflow: 'hidden',
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#242424',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1DB954',
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
  },
  meta: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  artist: {
    color: '#A0A0A0',
    fontSize: 12,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
