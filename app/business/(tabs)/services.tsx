import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { showAlert } from '@/lib/alert';
import { formatDuration, formatPrice, groupServices, type Service } from '@/lib/salons';

function ServiceRow({ service, first }: { service: Service; first: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/business/service/${service.id}`)}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {service.imageUrl ? (
        <Image source={{ uri: service.imageUrl }} style={styles.image} contentFit="cover" transition={200} />
      ) : null}
      <View style={styles.flex}>
        <Text variant="bodyStrong">{service.name}</Text>
        {service.description ? (
          <Text variant="caption" numberOfLines={1}>{service.description}</Text>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text variant="label">{service.addOn ? `+${formatPrice(service.priceNok)}` : formatPrice(service.priceNok)}</Text>
        <Text variant="caption" color={colors.textMuted}>
          {service.addOn ? `+${formatDuration(service.durationMin)}` : formatDuration(service.durationMin)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function ServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { salon, saveSalon } = useBusiness();

  if (!salon) return null;

  const addService = () => router.push('/business/service/new');
  const addAddOn = () => router.push({ pathname: '/business/service/[id]', params: { id: 'new', addOn: '1' } });
  const groups = groupServices(salon.services.filter((service) => !service.addOn));
  const addOns = salon.services.filter((service) => service.addOn);

  const toggleMenu = async (serviceMenu: boolean) => {
    try {
      await saveSalon({ serviceMenu });
    } catch (error) {
      console.error('Kunne ikke lagre visningen:', error);
      showAlert('Noe gikk galt', 'Kunne ikke lagre endringen. Prøv igjen.');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerInner}>
          <Text variant="title" style={styles.flex}>Tjenester</Text>
          {salon.services.length > 0 && (
            <>
              <IconButton
                icon="share-social-outline"
                variant="soft"
                size={36}
                onPress={() => router.push('/business/price-list')}
                accessibilityLabel="Del prisliste"
              />
              <Button title="Ny tjeneste" size="sm" icon="add" onPress={addService} />
            </>
          )}
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
          {/* Med bare én gruppe ser menyen ut som listen, så valget gir ingen forskjell */}
          {groups.length > 1 && (
            <View style={[styles.card, styles.switchRow]}>
              <View style={styles.flex}>
                <Text variant="bodyStrong">Vis som meny</Text>
                <Text variant="caption">
                  Kundene blar mellom gruppene og trykker på en tjeneste for å booke, i stedet for å se alt i én lang liste.
                </Text>
              </View>
              <Switch value={salon.serviceMenu} onValueChange={toggleMenu} accessibilityLabel="Vis tjenestene som meny" />
            </View>
          )}

          {groups.map((group) => (
            <View key={group.category} style={styles.group}>
              <Text variant="overline" style={styles.groupTitle}>{group.category}</Text>
              <View style={styles.card}>
                {group.services.map((service, index) => (
                  <ServiceRow key={service.id} service={service} first={index === 0} />
                ))}
              </View>
            </View>
          ))}

          <View style={styles.group}>
            <Text variant="overline" style={styles.groupTitle}>Tilleggstjenester</Text>
            {addOns.length > 0 && (
              <View style={styles.card}>
                {addOns.map((service, index) => (
                  <ServiceRow key={service.id} service={service} first={index === 0} />
                ))}
              </View>
            )}
            <Text variant="caption" style={styles.groupTitle}>
              Valgfrie tillegg kundene kan krysse av for når de booker, f.eks. fjerning eller brynsfarge. Tiden og prisen
              legges til timen.
            </Text>
            <Button title="Legg til tilleggstjeneste" variant="outline" size="sm" icon="add" onPress={addAddOn} style={styles.addButton} />
          </View>

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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  pressed: { backgroundColor: colors.background },
  meta: { alignItems: 'flex-end' },
  image: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.divider },
  addButton: { alignSelf: 'flex-start' },
});
