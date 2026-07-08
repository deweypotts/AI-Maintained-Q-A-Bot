import { Stack } from 'expo-router';
import { AuthGate } from '../components/AuthGate';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(main)" />
        </Stack>
      </AuthGate>
    </AuthProvider>
  );
}
