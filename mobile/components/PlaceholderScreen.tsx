import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../theme/colors';

interface PlaceholderScreenProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
}

export function PlaceholderScreen({ title, icon, description }: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={28} color={colors.primaryGreenDark} />
          </View>
          <Text style={styles.cardTitle}>Coming soon</Text>
          <Text style={styles.cardText}>{description ?? `${title} will live here.`}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primaryGreen,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: radii.card,
    borderBottomRightRadius: radii.card,
  },
  headerTitle: { color: colors.white, fontSize: 24, fontWeight: '700' },
  body: { flex: 1, padding: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  cardText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
