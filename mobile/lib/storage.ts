import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// AsyncStorage on web is backed by localStorage, which is shared across every
// tab/window of the same browser — fine for a real app, but it means two
// browser windows testing "technician" and "manager" side by side would
// silently share one session. sessionStorage is scoped per tab/window while
// still surviving a refresh of that same tab, which is what we actually want
// here. Native platforms don't have this problem (one app instance per
// device), so they keep using AsyncStorage.
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return window.sessionStorage.getItem(key);
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.sessionStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.sessionStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};
