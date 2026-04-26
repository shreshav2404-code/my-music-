import { useEffect, useMemo } from 'react';
import { Alert, BackHandler, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { FullPlayer } from '../components/player/FullPlayer';
import { useDynamicColor } from '../hooks/useDynamicColor';
import { RootStackParamList } from '../navigation/types';
import { useDownloadStore } from '../store/downloadStore';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { setSleepTimerMinutes, cancelSleepTimer } from '../services/sleepTimer';

export function NowPlayingScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'NowPlaying'>) {
  const player = usePlayerStore();
  const download = useDownloadStore((state) => state.startDownload);
  const toggleLike = useLibraryStore((state) => state.toggleLike);
  const standaloneMode = useSettingsStore((state) => state.standaloneMode);

  const dynamicColor = useDynamicColor(player.currentTrack?.thumbnail, '#1DB954');

  useEffect(() => {
    player.setDynamicColor(dynamicColor);
  }, [dynamicColor]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });

    return () => sub.remove();
  }, [navigation]);

  const repeatOrder: Array<'off' | 'one' | 'all'> = ['off', 'one', 'all'];

  const nextRepeat = useMemo(() => {
    const currentIndex = repeatOrder.indexOf(player.repeatMode);
    return repeatOrder[(currentIndex + 1) % repeatOrder.length];
  }, [player.repeatMode]);

  if (!player.currentTrack) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nothing is playing right now.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <Image source={{ uri: player.currentTrack.thumbnail }} style={styles.backgroundArt} contentFit="cover" />
      <View style={[styles.overlay, { backgroundColor: `${player.dynamicColor}88` }]} />
      <BlurView intensity={52} tint="dark" style={StyleSheet.absoluteFill} />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topButton}>
          <Ionicons name="chevron-down" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Now Playing</Text>
        <TouchableOpacity
          style={styles.topButton}
          onPress={() =>
            Share.share({
              message: `I'm listening to ${player.currentTrack?.title} by ${player.currentTrack?.artist} — ${player.currentTrack?.sourceUrl}`,
            })
          }
        >
          <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FullPlayer
        track={player.currentTrack}
        isPlaying={player.isPlaying}
        position={player.position}
        duration={player.duration || player.currentTrack.duration}
        volume={player.volume}
        isShuffle={player.isShuffle}
        repeatMode={player.repeatMode}
        accentColor={player.dynamicColor}
        onLike={() => toggleLike(player.currentTrack!.id)}
        onMore={() => navigation.navigate('Queue')}
        onSeek={player.seekTo}
        onTogglePlay={player.isPlaying ? player.pause : player.resume}
        onNext={player.skip}
        onPrevious={player.previous}
        onShuffle={player.shuffleQueue}
        onRepeat={() => player.setRepeat(nextRepeat)}
        onVolume={player.setVolume}
        onOpenQueue={() => navigation.navigate('Queue')}
        onOpenLyrics={() => navigation.navigate('Lyrics', { track: player.currentTrack! })}
      />

      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.bottomChip}
          onPress={() => {
            if (standaloneMode) {
              Alert.alert('Standalone mode is on', 'Disable Standalone mode in Settings to download online tracks.');
              return;
            }
            void download(player.currentTrack!, 320);
          }}
        >
          <Ionicons name="download-outline" size={16} color="#FFFFFF" />
          <Text style={styles.bottomLabel}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomChip} onPress={() => navigation.navigate('Queue')}>
          <Ionicons name="list-outline" size={16} color="#FFFFFF" />
          <Text style={styles.bottomLabel}>Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomChip}
          onPress={() => {
            if (player.sleepTimerEndAt) {
              cancelSleepTimer();
            } else {
              setSleepTimerMinutes(30);
            }
          }}
        >
          <Ionicons name="timer-outline" size={16} color="#FFFFFF" />
          <Text style={styles.bottomLabel}>{player.sleepTimerEndAt ? 'Cancel Timer' : 'Sleep 30m'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  backgroundArt: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    marginTop: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  topButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00000044',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 32,
  },
  bottomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderColor: '#FFFFFF33',
    borderWidth: 1,
    backgroundColor: '#00000055',
  },
  bottomLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#A0A0A0',
    fontSize: 15,
  },
});
