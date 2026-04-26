import { useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface Chip {
  key: string;
  label: string;
}

interface Props {
  chips: Chip[];
  activeKey: string;
  onSelect: (key: string) => void;
}

function ChipButton({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.chip,
          isActive ? styles.chipActive : styles.chipInactive,
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function FilterChips({ chips, activeKey, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {chips.map((chip) => (
          <ChipButton
            key={chip.key}
            label={chip.label}
            isActive={activeKey === chip.key}
            onPress={() => onSelect(chip.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#FFFFFF',
  },
  chipInactive: {
    backgroundColor: '#2A2A2A',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#000000',
  },
  chipTextInactive: {
    color: '#FFFFFF',
  },
});
