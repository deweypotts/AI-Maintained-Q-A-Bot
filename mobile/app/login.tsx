import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { Role } from '../types/chat';

export default function Login() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('technician');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(name, role);
      router.replace('/');
    } catch (err) {
      setError('Could not reach the server. Is it running?');
    } finally {
      setSubmitting(false);
    }
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

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={!name.trim() || submitting}>
        <Text style={styles.loginText}>{submitting ? 'Signing in...' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.white },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', color: colors.textPrimary },
  subtitle: { fontSize: 15, textAlign: 'center', color: colors.textSecondary, marginTop: 4, marginBottom: 32 },
  input: {
    backgroundColor: colors.background,
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
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleButtonActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  roleText: { color: '#374151', fontWeight: '600' },
  roleTextActive: { color: colors.white },
  loginButton: { backgroundColor: colors.navy, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  loginText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center', marginBottom: 12 },
});
