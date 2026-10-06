import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    // Skjermene tegner sin egen topp med safe area, så fanenes standard-header skjules
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF', headerShown: false }}>
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Utforsk',
          tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bestillinger',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />
        }}
      />
    </Tabs>
  );
}
