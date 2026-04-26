import { FlatList, StyleSheet, View } from 'react-native';
import { Album } from '../../types';
import { AlbumCard } from '../cards/AlbumCard';
import { EmptyState } from '../ui/EmptyState';

interface Props {
  albums: Album[];
  onPressAlbum: (album: Album) => void;
}

export function AlbumGrid({ albums, onPressAlbum }: Props) {
  if (albums.length === 0) {
    return <EmptyState title="No albums yet" message="Albums will appear once your songs are indexed." />;
  }

  return (
    <FlatList
      data={albums}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <AlbumCard album={item} onPress={onPressAlbum} />}
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
  row: {
    justifyContent: 'space-between',
  },
});