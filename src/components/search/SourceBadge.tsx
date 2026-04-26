import { StyleSheet, Text, View } from 'react-native';
import { sourceColor } from '../../constants/colors';

interface Props {
  source: string;
}

export function SourceBadge({ source }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: `${sourceColor(source)}33`, borderColor: `${sourceColor(source)}88` }]}>
      <Text style={[styles.label, { color: sourceColor(source) }]}>{source.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});