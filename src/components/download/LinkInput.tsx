import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
}

export function LinkInput({ value, onChangeText, onSubmit }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="link-outline" size={18} color="#A0A0A0" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Paste YouTube / SoundCloud / URL"
        placeholderTextColor="#606060"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity onPress={onSubmit} style={styles.button}>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#141414',
    borderColor: '#2A2A2A',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  button: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1DB954',
  },
});