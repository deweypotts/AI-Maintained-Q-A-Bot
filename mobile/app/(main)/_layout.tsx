import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchChatsList } from '../../lib/api';
import { colors } from '../../theme/colors';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  chat: 'chatbubble-ellipses',
  activity: 'stats-chart',
  scorecard: 'bar-chart',
  leaderboards: 'trophy',
  you: 'person',
};

const BADGE_POLL_INTERVAL_MS = 4000;

function useManagerAttentionCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (user?.role !== 'manager') return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const result = await fetchChatsList();
        if (!cancelled) setCount(result.chats.filter((c) => c.hasUnread).length);
      } catch {
        // ignore — badge just won't update this tick
      }
    };

    refresh();
    const interval = setInterval(refresh, BADGE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.role]);

  return count;
}

export default function MainLayout() {
  const attentionCount = useManagerAttentionCount();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: { backgroundColor: colors.navy, borderTopWidth: 0 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name] ?? 'ellipse'} size={size} color={color} />,
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarBadge: attentionCount > 0 ? attentionCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger },
        }}
        listeners={{
          // Every time the Chat tab is pressed — including returning from
          // another tab — land back on the inbox instead of wherever the
          // tab's internal stack last was.
          tabPress: () => {
            router.replace('/chat');
          },
        }}
      />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="scorecard" options={{ title: 'Scorecard' }} />
      <Tabs.Screen name="leaderboards" options={{ title: 'Leaderboards' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}
