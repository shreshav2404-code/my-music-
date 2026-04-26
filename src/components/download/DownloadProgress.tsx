import { StyleSheet, Text, View } from 'react-native';
import { DownloadItem } from '../../types';

interface Props {
  item: DownloadItem;
}

export function DownloadProgress({ item }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1}>
          {item.song.title}
        </Text>
        <Text style={styles.percent}>{Math.round(item.progress)}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, item.progress))}%` }]} />
      </View>

      <Text style={styles.caption}>
        {item.status.toUpperCase()}
        {item.eta ? ` • ETA ${item.eta}s` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242424',
    padding: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  percent: {
    color: '#A0A0A0',
    fontSize: 12,
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#242424',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#1DB954',
  },
  caption: {
    color: '#A0A0A0',
    fontSize: 12,
  },
});