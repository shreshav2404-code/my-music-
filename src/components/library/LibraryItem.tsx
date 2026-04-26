import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

export type LibraryItemType = 'playlist' | 'album' | 'artist' | 'downloaded' | 'liked';

interface Props {
  type: LibraryItemType;
  title: string;
  subtitle: string;
  thumbnail?: string;
  isPinned?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

function PinnedIcon() {
  return (
    <View style={styles.pinContainer}>
      <Ionicons name="pin" size={14} color="#1DB954" />
    </View>
  );
}

function LikedSongsThumbnail() {
  return (
    <View style={[styles.specialThumb, styles.likedGradient]}>
      <Ionicons name="heart" size={24} color="#FFFFFF" />
    </View>
  );
}

function DownloadedThumbnail() {
  return (
    <View style={[styles.specialThumb, styles.downloadBg]}>
      <Ionicons name="arrow-down-circle" size={24} color="#1DB954" />
    </View>
  );
}

export function LibraryItem({ type, title, subtitle, thumbnail, isPinned, onPress, onLongPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start();
  };

  const isCircle = type === 'artist';

  const renderThumbnail = () => {
    if (type === 'liked') {
      return <LikedSongsThumbnail />;
    }
    if (type === 'downloaded') {
      return <DownloadedThumbnail />;
    }
    if (thumbnail) {
      return (
        <Image
          source={{ uri: thumbnail }}
          style={[styles.thumbnail, isCircle && styles.thumbnailCircle]}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      );
    }
    return (
      <View style={[styles.thumbnail, styles.placeholderThumb, isCircle && styles.thumbnailCircle]}>
        <Ionicons
          name={type === 'artist' ? 'person' : type === 'album' ? 'disc' : 'musical-notes'}
          size={24}
          color="#535353"
        />
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={400}
    >
      <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
        {renderThumbnail()}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {isPinned ? <PinnedIcon /> : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 16,
    gap: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  thumbnailCircle: {
    borderRadius: 28,
  },
  placeholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialThumb: {
    width: 56,
    height: 56,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedGradient: {
    backgroundColor: '#7B4FBF',
  },
  downloadBg: {
    backgroundColor: '#282828',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 13,
    fontWeight: '400',
  },
  pinContainer: {
    padding: 4,
  },
});
