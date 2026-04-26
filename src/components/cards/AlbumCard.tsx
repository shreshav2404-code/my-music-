import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Album } from '../../types';

interface Props {
  album: Album;
  onPress: (album: Album) => void;
}

export function AlbumCard({ album, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(album)}>
      <Image source={{ uri: album.thumbnail }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {album.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {album.artist}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#232323',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#1E1E1E',
  },
  meta: {
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 12,
  },
});