import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Track } from '../../types';
import { TrackCard } from '../cards/TrackCard';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

interface Props {
  isLoading: boolean;
  error: string | null;
  results: Track[];
  onPlay: (track: Track) => void;
  onDownload: (track: Track) => void;
}

export function SearchResults({ isLoading, error, results, onPlay, onDownload }: Props) {
  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <Skeleton height={72} borderRadius={18} />
        <Skeleton height={72} borderRadius={18} />
        <Skeleton height={72} borderRadius={18} />
      </View>
    );
  }

  if (error) {
    return <EmptyState icon="warning-outline" title="Search failed" message={error} />;
  }

  if (results.length === 0) {
    return <EmptyState title="Start searching" message="Find songs by name or paste a direct URL to stream/download." />;
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <TrackCard track={item} onPress={onPlay} onDownload={onDownload} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={<Text style={styles.count}>{results.length} results</Text>}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 12,
  },
  list: {
    padding: 16,
    paddingBottom: 180,
  },
  count: {
    color: '#A0A0A0',
    fontSize: 12,
    marginBottom: 10,
  },
});