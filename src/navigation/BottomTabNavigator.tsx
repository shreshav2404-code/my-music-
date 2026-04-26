import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { palette } from '../constants/colors';
import { DownloadsScreen } from '../screens/DownloadsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useSettingsStore } from '../store/settingsStore';
import { BottomTabParamList } from './types';

const Tab = createBottomTabNavigator<BottomTabParamList>();

function iconForRoute(routeName: keyof BottomTabParamList, focused: boolean): keyof typeof Ionicons.glyphMap {
  if (routeName === 'Home') {
    return focused ? 'home' : 'home-outline';
  }
  if (routeName === 'Search') {
    return focused ? 'search' : 'search-outline';
  }
  if (routeName === 'Library') {
    return focused ? 'library' : 'library-outline';
  }
  if (routeName === 'Downloads') {
    return focused ? 'download' : 'download-outline';
  }
  return focused ? 'settings' : 'settings-outline';
}

export function BottomTabNavigator() {
  const accentColor = useSettingsStore((state) => state.accentColor);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 10,
          borderRadius: 18,
          backgroundColor: '#101010',
          borderTopColor: '#1F1F1F',
          borderWidth: 1,
          borderColor: '#212121',
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarActiveTintColor: accentColor || palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons name={iconForRoute(route.name, focused)} color={color} size={focused ? size + 1 : size} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Downloads" component={DownloadsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
