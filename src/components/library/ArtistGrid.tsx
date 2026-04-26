import { FlatList, StyleSheet, View } from 'react-native';
import { Artist } from '../../types';
import { ArtistCard } from '../cards/ArtistCard';
import { EmptyState } from '../ui/EmptyState';

interface Props {
  artists: Artist[];
  onPressArtist: (artist: Artist) => void;
}

export function ArtistGrid({ artists, onPressArtist }: Props) {
  if (artists.length === 0) {
    return <EmptyState title="No artists yet" message="Artists are generated automatically from your tracks." />;
  }

  return (
    <FlatList
      data={artists}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <ArtistCard artist={item} onPress={onPressArtist} />}
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