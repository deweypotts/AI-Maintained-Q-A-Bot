import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types/chat';

export default function Login() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('technician');

  const handleLogin = () => {
    if (!name.trim()) return;
    login(name, role);
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Applause</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor="#9CA3AF"
      />

      <View style={styles.roleRow}>
        {(['technician', 'manager'] as Role[]).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.roleButton, role === r && styles.roleButtonActive]}
            onPress={() => setRole(r)}
          >
            <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
              {r === 'technician' ? 'Technician' : 'Manager'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={!name.trim()}>
        <Text style={styles.loginText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', color: '#111827' },
  subtitle: { fontSize: 15, textAlign: 'center', color: '#6B7280', marginTop: 4, marginBottom: 32 },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  roleButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  roleText: { color: '#374151', fontWeight: '600' },
  roleTextActive: { color: '#FFFFFF' },
  loginButton: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  loginText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
