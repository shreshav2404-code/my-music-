import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  downloadedCount: number;
  usedBytes: number;
  totalBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function StorageCard({ downloadedCount, usedBytes, totalBytes }: Props) {
  const usedLabel = formatBytes(usedBytes);
  const totalLabel = formatBytes(totalBytes);
  const progressPercent = totalBytes > 0 ? Math.min(100, (usedBytes / totalBytes) * 100) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="arrow-down-circle" size={32} color="#1DB954" />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>
            {downloadedCount} song{downloadedCount !== 1 ? 's' : ''} downloaded
          </Text>
          <Text style={styles.subtitle}>{usedLabel} used</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <Text style={styles.storageLabel}>
        {usedLabel} / {totalLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 13,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1DB954',
    borderRadius: 2,
  },
  storageLabel: {
    color: '#727272',
    fontSize: 12,
    textAlign: 'right',
  },
});
