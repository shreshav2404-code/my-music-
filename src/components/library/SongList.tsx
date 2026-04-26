import { FlatList, StyleSheet, View } from 'react-native';
import { Track } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { TrackCard } from '../cards/TrackCard';

interface Props {
  songs: Track[];
  onPlay: (song: Track) => void;
  onDownload?: (song: Track) => void;
}

export function SongList({ songs, onPlay, onDownload }: Props) {
  if (songs.length === 0) {
    return <EmptyState title="No songs yet" message="Search, stream, or scan local files to fill your library." />;
  }

  return (
    <FlatList
      data={songs}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <TrackCard track={item} onPress={onPlay} onDownload={onDownload} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 120,
  },
});