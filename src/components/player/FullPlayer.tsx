import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Track } from '../../types';
import { Controls } from './Controls';
import { ProgressBar } from './ProgressBar';
import { VolumeSlider } from './VolumeSlider';
import { useEffect } from 'react';

interface Props {
  track: Track;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'one' | 'all';
  accentColor: string;
  onLike: () => void;
  onMore: () => void;
  onSeek: (value: number) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onVolume: (value: number) => void;
  onOpenQueue: () => void;
  onOpenLyrics: () => void;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

export function FullPlayer({
  track,
  isPlaying,
  position,
  duration,
  volume,
  isShuffle,
  repeatMode,
  accentColor,
  onLike,
  onMore,
  onSeek,
  onTogglePlay,
  onNext,
  onPrevious,
  onShuffle,
  onRepeat,
  onVolume,
  onOpenQueue,
  onOpenLyrics,
}: Props) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isPlaying) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 20_000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rotation);
    }
  }, [isPlaying]);

  const albumArtStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: withTiming(isPlaying ? 1 : 0.95, { duration: 200 }) },
    ],
  }));

  return (
    <View style={styles.container}>
      <AnimatedImage
        source={{ uri: track.thumbnail }}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={[styles.artwork, albumArtStyle]}
      />

      <View style={styles.metaRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>

        <TouchableOpacity onPress={onLike} style={styles.iconAction}>
          <Ionicons name={track.isLiked ? 'heart' : 'heart-outline'} size={22} color={track.isLiked ? '#FF4D6D' : '#FFFFFF'} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onMore} style={styles.iconAction}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ProgressBar position={position} duration={duration} accentColor={accentColor} onSeek={onSeek} />

      <Controls
        isPlaying={isPlaying}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        accentColor={accentColor}
        onTogglePlay={onTogglePlay}
        onNext={onNext}
        onPrevious={onPrevious}
        onShuffle={onShuffle}
        onRepeat={onRepeat}
      />

      <VolumeSlider value={volume} accentColor={accentColor} onChange={onVolume} />

      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.bottomAction} onPress={onOpenLyrics}>
          <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
          <Text style={styles.bottomLabel}>Lyrics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomAction} onPress={onOpenQueue}>
          <Ionicons name="list-outline" size={18} color="#FFFFFF" />
          <Text style={styles.bottomLabel}>Queue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    marginTop: 40,
    backgroundColor: '#181818',
  },
  metaRow: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  artist: {
    color: '#A0A0A0',
    fontSize: 16,
    marginTop: 4,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161616',
  },
  bottomActions: {
    marginTop: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bottomLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});