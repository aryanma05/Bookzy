import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { formatDuration, formatPrice, groupServices } from '@/lib/salons';

export default function ServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { salon } = useBusiness();

  if (!salon) return null;

  const addService = () => router.push('/business/service/new');

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerInner}>
          <Text variant="title" style={styles.flex}>Tjenester</Text>
          {salon.services.length > 0 && <Button title="Ny tjeneste" size="sm" icon="add" onPress={addService} />}
        </View>
      </View>

      {salon.services.length === 0 ? (
        <EmptyState
          icon="pricetags-outline"
          title="Legg inn det du tilbyr"
          message="Kundene kan bare booke tjenester som står her. Varigheten bestemmer hvor mye av kalenderen hver time tar."
          actionLabel="Legg til tjeneste"
          onAction={addService}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {groupServices(salon.services).map((group) => (
            <View key={group.category} style={styles.group}>
              <Text variant="overline" style={styles.groupTitle}>{group.category}</Text>
              <View style={styles.card}>
                {group.services.map((service, index) => (
                  <Pressable
                    key={service.id}
                    onPress={() => router.push(`/business/service/${service.id}`)}
                    style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}
                    accessibilityRole="button"
                  >
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{service.name}</Text>
                      {service.description ? (
                        <Text variant="caption" numberOfLines={1}>{service.description}</Text>
                      ) : null}
                    </View>
                    <View style={styles.meta}>
                      <Text variant="label">{formatPrice(service.priceNok)}</Text>
                      <Text variant="caption" color={colors.textMuted}>{formatDuration(service.durationMin)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          <Text variant="caption" color={colors.textMuted} align="center">
            Endringer i pris og varighet gjelder nye bookinger. Timer som allerede er booket, beholder det kunden så.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', maxWidth: 720, alignSelf: 'center' },
  content: { padding: 20, gap: 20, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },
  group: { gap: 8 },
  groupTitle: { marginLeft: 4 },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden', ...shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  pressed: { backgroundColor: colors.background },
  meta: { alignItems: 'flex-end' },
});
