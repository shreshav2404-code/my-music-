import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Playlist } from '../../types';

interface Props {
  playlist: Playlist;
  onPress: (playlist: Playlist) => void;
}

export function PlaylistCard({ playlist, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(playlist)}>
      <Image source={{ uri: playlist.thumbnail }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {playlist.description || 'Custom playlist'}
        </Text>
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
    borderRadius: 14,
    backgroundColor: '#1E1E1E',
  },
  meta: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 12,
    marginTop: 2,
  },
});