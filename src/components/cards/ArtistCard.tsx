import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Artist } from '../../types';

interface Props {
  artist: Artist;
  onPress: (artist: Artist) => void;
}

export function ArtistCard({ artist, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(artist)}>
      <Image source={{ uri: artist.thumbnail }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {artist.name}
        </Text>
        <Text style={styles.count}>{artist.songCount} songs</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242424',
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E1E1E',
  },
  meta: {
    flex: 1,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  count: {
    color: '#A0A0A0',
    fontSize: 12,
    marginTop: 2,
  },
});