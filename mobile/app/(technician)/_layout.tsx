import { Stack } from 'expo-router';

export default function TechnicianLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Applause' }} />
    </Stack>
  );
}
