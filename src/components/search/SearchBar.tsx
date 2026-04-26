import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { isUrl } from '../../utils/string';

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export function SearchBar({ value, onChangeText, onSubmit, onClear }: Props) {
  const linkMode = isUrl(value.trim());

  return (
    <View style={[styles.container, linkMode && styles.linkMode]}>
      <Ionicons name={linkMode ? 'link-outline' : 'search'} size={18} color="#A0A0A0" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={linkMode ? 'Paste link and hit enter' : 'Search songs, albums, artists'}
        placeholderTextColor="#606060"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
      />
      {!!value && (
        <TouchableOpacity onPress={onClear}>
          <Ionicons name="close-circle" size={18} color="#606060" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
    paddingHorizontal: 14,
    gap: 10,
    height: 48,
  },
  linkMode: {
    borderColor: '#3A6AFF',
    backgroundColor: '#101625',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
});