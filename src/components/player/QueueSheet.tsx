import { Ionicons } from '@expo/vector-icons';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Track } from '../../types';
import { formatDuration } from '../../utils/format';

interface Props {
  currentTrackId?: string;
  queue: Track[];
  onSelect: (track: Track) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function QueueSheet({ currentTrackId, queue, onSelect, onRemove, onClear }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Queue</Text>
        <TouchableOpacity onPress={onClear}>
          <Text style={styles.clear}>Clear queue</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => onSelect(item)}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.song, item.id === currentTrackId && styles.active]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {item.artist}
              </Text>
            </View>
            <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
            <TouchableOpacity onPress={() => onRemove(item.id)}>
              <Ionicons name="close" size={18} color="#A0A0A0" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  clear: {
    color: '#FF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  song: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  active: {
    color: '#1DB954',
  },
  artist: {
    color: '#A0A0A0',
    fontSize: 12,
  },
  duration: {
    color: '#707070',
    fontSize: 12,
  },
});