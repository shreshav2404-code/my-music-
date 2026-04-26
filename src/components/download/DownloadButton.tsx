import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface Props {
  isDownloaded?: boolean;
  onPress: () => void;
}

export function DownloadButton({ isDownloaded, onPress }: Props) {
  return (
    <TouchableOpacity style={[styles.button, isDownloaded && styles.done]} onPress={onPress}>
      <Ionicons name={isDownloaded ? 'checkmark' : 'download-outline'} size={16} color="#FFFFFF" />
      <Text style={styles.label}>{isDownloaded ? 'Downloaded' : 'Download'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  done: {
    borderColor: '#1DB954',
    backgroundColor: '#1DB95444',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});