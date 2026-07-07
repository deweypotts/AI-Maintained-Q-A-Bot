import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { user } = useAuth();

  if (!user) return <Redirect href="/login" />;
  if (user.role === 'manager') return <Redirect href="/(manager)/chats" />;
  return <Redirect href="/(technician)" />;
}
