import { Redirect, usePathname } from 'expo-router';
import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

// Guards every route, not just "/" — on web, refreshing while deep-linked
// into a nested tab (e.g. /chat) skips app/index.tsx entirely, so without
// this the screen would just hang waiting on a session that never arrives.
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primaryGreen} />
      </View>
    );
  }

  if (!user && pathname !== '/login') {
    return <Redirect href="/login" />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
});
