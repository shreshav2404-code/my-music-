import { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useLocalFiles } from '../hooks/useLocalFiles';
import { useSettingsStore } from '../store/settingsStore';
import { useSearchStore } from '../store/searchStore';

const eqPresets: Record<string, number[]> = {
  Normal: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 2, 1, 0, -1, -2, -2, -3],
  'Treble Boost': [-2, -1, 0, 1, 2, 3, 4, 5, 6, 6],
  Vocal: [-1, 0, 1, 3, 4, 4, 2, 1, 0, -1],
  Electronic: [4, 3, 1, 0, -1, 1, 3, 4, 5, 4],
  Rock: [5, 3, 1, -1, -2, 0, 2, 3, 4, 5],
};

export function SettingsScreen() {
  const settings = useSettingsStore();
  const search = useSearchStore();
  const scanner = useLocalFiles();

  const sourceOrderLabel = useMemo(() => settings.sourcePriority.join(' > '), [settings.sourcePriority]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* Info banner — no server needed */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoTitle}>🎵 Fully on-device</Text>
        <Text style={styles.infoText}>
          mukx works entirely from your phone — no server required. Search, stream, and download using free public APIs.
        </Text>
      </View>

      <Text style={styles.section}>Audio</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Stream quality</Text>
        <View style={styles.rowWrap}>
          {(['low', 'normal', 'high'] as const).map((q) => (
            <TouchableOpacity
              key={q}
              style={[styles.pill, settings.streamQuality === q && styles.pillActive]}
              onPress={() => settings.setStreamQuality(q)}
            >
              <Text style={[styles.pillText, settings.streamQuality === q && styles.pillTextActive]}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Download quality</Text>
        <View style={styles.rowWrap}>
          {[128, 192, 320].map((q) => (
            <TouchableOpacity
              key={q}
              style={[styles.pill, settings.downloadQuality === q && styles.pillActive]}
              onPress={() => settings.setDownloadQuality(q as 128 | 192 | 320)}
            >
              <Text style={[styles.pillText, settings.downloadQuality === q && styles.pillTextActive]}>{q} kbps</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Crossfade ({settings.crossfadeDuration}s)</Text>
        <Slider
          minimumValue={0}
          maximumValue={12}
          step={1}
          value={settings.crossfadeDuration}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#2A2A2A"
          thumbTintColor="#1DB954"
          onValueChange={settings.setCrossfadeDuration}
        />

        <RowSwitch label="Normalize volume" value={settings.normalizeVolume} onChange={settings.toggleNormalizeVolume} />
      </View>

      <Text style={styles.section}>Sources</Text>
      <View style={styles.card}>
        <Text style={styles.subtle}>Priority: {sourceOrderLabel}</Text>
        {settings.sourcePriority.map((source) => (
          <RowSwitch
            key={source}
            label={source}
            value={settings.sourcesEnabled[source] ?? true}
            onChange={() => settings.toggleSource(source)}
          />
        ))}
      </View>

      <Text style={styles.section}>Downloads</Text>
      <View style={styles.card}>
        <RowSwitch label="Download on Wi-Fi only" value={settings.downloadOnWifiOnly} onChange={settings.toggleWifiOnly} />
        <Text style={styles.subtle}>Default location: app/documents/downloads</Text>
      </View>

      <Text style={styles.section}>Library</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.actionButton} onPress={scanner.scan}>
          <Text style={styles.actionText}>Scan local files</Text>
        </TouchableOpacity>
        <Text style={styles.subtle}>{scanner.scanStatus || 'Idle'}</Text>
        <RowSwitch label="Auto-scan on startup" value={settings.autoScanOnStartup} onChange={settings.setAutoScanOnStartup} />
      </View>

      <Text style={styles.section}>Appearance</Text>
      <View style={styles.card}>
        <View style={styles.rowWrap}>
          {(['dark', 'light', 'system'] as const).map((theme) => (
            <TouchableOpacity
              key={theme}
              style={[styles.pill, settings.theme === theme && styles.pillActive]}
              onPress={() => settings.setTheme(theme)}
            >
              <Text style={[styles.pillText, settings.theme === theme && styles.pillTextActive]}>{theme}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Accent color</Text>
        <View style={styles.colorRow}>
          {['#1DB954', '#FF4D6D', '#4DA3FF', '#F59E0B', '#8B5CF6', '#14B8A6'].map((color) => (
            <TouchableOpacity
              key={color}
              style={[styles.colorDot, { backgroundColor: color }, settings.accentColor === color && styles.colorActive]}
              onPress={() => settings.setAccentColor(color)}
            />
          ))}
        </View>

        <Text style={styles.label}>Album art blur ({Math.round(settings.albumArtBlurIntensity)})</Text>
        <Slider
          minimumValue={0}
          maximumValue={100}
          step={1}
          value={settings.albumArtBlurIntensity}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#2A2A2A"
          thumbTintColor="#1DB954"
          onValueChange={settings.setAlbumArtBlurIntensity}
        />
      </View>

      <Text style={styles.section}>Equalizer</Text>
      <View style={styles.card}>
        <View style={styles.rowWrap}>
          {Object.keys(eqPresets).map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[styles.pill, settings.equalizerPreset === preset && styles.pillActive]}
              onPress={() => settings.setEqualizerPreset(preset, eqPresets[preset])}
            >
              <Text style={[styles.pillText, settings.equalizerPreset === preset && styles.pillTextActive]}>{preset}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.section}>About</Text>
      <View style={styles.card}>
        <Text style={styles.subtle}>mukx v1.0.0</Text>
        <Text style={styles.about}>Built with ❤️ by Keshu</Text>
        <Text style={styles.subtle}>Powered by Piped, Jamendo & lrclib (all free, no API keys)</Text>
        <TouchableOpacity style={styles.actionButton} onPress={search.clearHistory}>
          <Text style={styles.actionText}>Clear search history</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function RowSwitch({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.rowSwitch}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#2A2A2A', true: '#1DB954' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
  },
  infoBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#225A3A',
    backgroundColor: '#12261B',
    padding: 14,
    marginBottom: 6,
  },
  infoTitle: {
    color: '#7DE2A8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoText: {
    color: '#A0A0A0',
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242424',
    backgroundColor: '#141414',
    padding: 12,
    gap: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  subtle: {
    color: '#A0A0A0',
    fontSize: 12,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#191919',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillActive: {
    borderColor: '#1DB954',
    backgroundColor: '#1DB95433',
  },
  pillText: {
    color: '#A0A0A0',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  pillTextActive: {
    color: '#1DB954',
    fontWeight: '700',
  },
  rowSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  actionButton: {
    borderRadius: 12,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  actionText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorActive: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  about: {
    color: '#FFFFFF',
    fontSize: 13,
  },
});
