import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/DashboardScreen';
import NewReadingScreen from '../screens/NewReadingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SubmissionsScreen from '../screens/SubmissionsScreen';
import SyncScreen from '../screens/SyncScreen';
import { COLORS } from '../lib/theme';
import { useSync } from '../lib/sync-context';

export type MainTabParamList = {
  Home: undefined;
  NewReading: undefined;
  Submissions: undefined;
  Sync: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const { stats } = useSync();
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 16) + 8;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          paddingTop: 6,
          paddingBottom: tabBarBottom,
          height: 56 + tabBarBottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="NewReading"
        component={NewReadingScreen}
        options={{
          title: 'New',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Submissions"
        component={SubmissionsScreen}
        options={{
          title: 'Readings',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Sync"
        component={SyncScreen}
        options={{
          title: 'Sync',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sync" color={color} size={size} />
          ),
          tabBarBadge: stats.pending > 0 ? (stats.pending > 99 ? '99+' : stats.pending) : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.destructive, fontSize: 10 },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
