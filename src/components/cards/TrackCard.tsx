import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Track } from '../../types';
import { formatDuration } from '../../utils/format';
import { SourceBadge } from '../search/SourceBadge';

interface Props {
  track: Track;
  onPress: (track: Track) => void | Promise<void>;
  onDownload?: (track: Track) => void | Promise<void>;
  onMore?: (track: Track) => void | Promise<void>;
}

export function TrackCard({ track, onPress, onDownload, onMore }: Props) {
  const runSafe = (action: (() => void | Promise<void>) | undefined) => {
    if (!action) {
      return;
    }
    Promise.resolve(action()).catch(() => undefined);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={() => runSafe(() => onPress(track))}>
      <Image source={{ uri: track.thumbnail }} style={styles.cover} contentFit="cover" cachePolicy="memory-disk" />

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {track.artist}
        </Text>
        <View style={styles.badges}>
          <SourceBadge source={track.source} />
          <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {onDownload ? (
          <TouchableOpacity style={styles.iconButton} onPress={() => runSafe(() => onDownload(track))}>
            <Ionicons name={track.isDownloaded ? 'checkmark-circle' : 'download-outline'} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
        {onMore ? (
          <TouchableOpacity style={styles.iconButton} onPress={() => runSafe(() => onMore(track))}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#A0A0A0" />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    gap: 12,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#1E1E1E',
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 13,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  duration: {
    color: '#707070',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
});
