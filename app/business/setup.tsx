import { useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import { salonLink, shareBookingLink } from '@/lib/links';
import { formatDuration, formatPrice } from '@/lib/salons';
import { WEEK } from '@/lib/schedule';

const STEPS = ['services', 'hours', 'photos', 'publish'] as const;

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={styles.check}>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? colors.success : colors.textMuted} />
      <Text variant="body" style={styles.flex}>{label}</Text>
    </View>
  );
}

/** Veileder nye bedrifter gjennom det som trengs før siden kan publiseres. Hvert steg åpner den vanlige skjermen og kommer tilbake hit. */
export default function SetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { salon, saveSalon } = useBusiness();
  // Har de lagt inn tjenester før, fortsetter de der de slapp
  const [index, setIndex] = useState(() => (salon && salon.services.length > 0 ? 1 : 0));
  const [publishing, setPublishing] = useState(false);

  if (!salon) return null;

  const openDays = WEEK.filter(({ key }) => salon.openingHours[key]).length;
  const canPublish = salon.services.length > 0 && openDays > 0;
  const link = salonLink(salon.id);

  const next = () => {
    haptics.select();
    setIndex(index + 1);
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await saveSalon({ published: true });
      haptics.success();
    } catch (error) {
      console.error('Kunne ikke publisere:', error);
      showAlert('Noe gikk galt', 'Kunne ikke publisere siden. Sjekk nettet og prøv igjen.');
    } finally {
      setPublishing(false);
    }
  };

  if (salon.published) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 40 }]}>
        <ScrollView contentContainerStyle={[styles.content, styles.doneContent]}>
          <Animated.View entering={ZoomIn.springify().damping(80)} style={styles.doneCircle}>
            <Ionicons name="checkmark" size={52} color="#FFFFFF" />
          </Animated.View>
          <Text variant="display" align="center">Siden din er publisert!</Text>
          <Text variant="body" color={colors.textSecondary} align="center">
            Nå kan kundene finne deg og booke. Legg bookinglenken i Instagram-bio eller send den på SMS, og del prislisten som
            story.
          </Text>
          {link && (
            <Text variant="label" color={colors.primaryDark} align="center">{link.replace(/^https:\/\//, '')}</Text>
          )}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          {link && (
            <Button
              title={Platform.OS === 'web' ? 'Kopier bookinglenke' : 'Del bookinglenke'}
              icon={Platform.OS === 'web' ? 'copy-outline' : 'share-outline'}
              onPress={() => shareBookingLink(link)}
            />
          )}
          <Button title="Del prisliste" variant="outline" icon="pricetags-outline" onPress={() => router.push('/business/price-list')} />
          <Button title="Gå til kalenderen" variant="ghost" onPress={() => router.replace('/business/calendar')} />
        </View>
      </View>
    );
  }

  const step = STEPS[index];
  let icon: keyof typeof Ionicons.glyphMap;
  let title: string;
  let text: string;
  let body: ReactNode = null;
  let actions: ReactNode;

  if (step === 'services') {
    icon = 'pricetags-outline';
    title = 'Hva tilbyr du?';
    text = 'Legg inn behandlingene dine med pris og hvor lang tid de tar. Varigheten bestemmer hvilke tider kundene kan booke.';
    const addService = () => router.push('/business/service/new');
    body = salon.services.length > 0 && (
      <View style={styles.card}>
        {salon.services.map((service, i) => (
          <View key={service.id} style={[styles.row, i > 0 && styles.divider]}>
            <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>{service.name}</Text>
            <Text variant="caption">{formatDuration(service.durationMin)}</Text>
            <Text variant="label">{formatPrice(service.priceNok)}</Text>
          </View>
        ))}
      </View>
    );
    actions =
      salon.services.length > 0 ? (
        <>
          <Button title="Neste" icon="arrow-forward" onPress={next} />
          <Button title="Legg til en til" variant="outline" icon="add" onPress={addService} />
        </>
      ) : (
        <Button title="Legg til tjeneste" icon="add" onPress={addService} />
      );
  } else if (step === 'hours') {
    icon = 'time-outline';
    title = 'Når tar du imot kunder?';
    text = 'Vi har fylt inn hverdager 9–17. Endre dagene og tidene så de passer deg. Fridager og ferie legger du inn senere.';
    body = (
      <View style={styles.card}>
        {WEEK.map(({ key, label }, i) => {
          const hours = salon.openingHours[key];
          return (
            <View key={key} style={[styles.row, i > 0 && styles.divider]}>
              <Text variant="body" style={styles.flex}>{label}</Text>
              <Text variant={hours ? 'label' : 'caption'}>{hours ? `${hours.open}–${hours.close}` : 'Stengt'}</Text>
            </View>
          );
        })}
      </View>
    );
    actions = (
      <>
        <Button title="Ser bra ut" icon="arrow-forward" disabled={openDays === 0} onPress={next} />
        <Button title="Endre åpningstider" variant="outline" icon="create-outline" onPress={() => router.push('/business/hours')} />
      </>
    );
  } else if (step === 'photos') {
    icon = 'images-outline';
    title = 'Vis frem arbeidet ditt';
    text = 'Kundene vil se hva de får. Legg inn bilder av arbeidet ditt eller salongen. Det første bildet blir forsidebildet.';
    const openPhotos = () => router.push('/business/photos');
    body = salon.photos.length > 0 && (
      <View style={styles.photos}>
        {salon.photos.slice(0, 4).map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" transition={200} />
        ))}
      </View>
    );
    actions =
      salon.photos.length > 0 ? (
        <>
          <Button title="Neste" icon="arrow-forward" onPress={next} />
          <Button title="Endre bilder" variant="outline" icon="create-outline" onPress={openPhotos} />
        </>
      ) : (
        <>
          <Button title="Legg til bilder" icon="add" onPress={openPhotos} />
          <Button title="Hopp over for nå" variant="ghost" onPress={next} />
        </>
      );
  } else {
    icon = 'globe-outline';
    title = 'Klar til å publisere';
    text = 'Når siden er publisert, kan kundene finne deg og booke. Du kan skjule den igjen når du vil.';
    body = (
      <>
        <View style={[styles.card, styles.checks]}>
          <Check done={salon.services.length > 0} label={`${salon.services.length} ${salon.services.length === 1 ? 'tjeneste' : 'tjenester'}`} />
          <Check done={openDays > 0} label={openDays > 0 ? `Åpent ${openDays} ${openDays === 1 ? 'dag' : 'dager'} i uka` : 'Ingen åpne dager'} />
          <Check done={salon.photos.length > 0} label={salon.photos.length > 0 ? `${salon.photos.length} bilder` : 'Ingen bilder ennå (valgfritt)'} />
        </View>
        <Button
          title="Se siden slik kundene ser den"
          variant="secondary"
          size="sm"
          icon="eye-outline"
          onPress={() => router.push(`/salon/${salon.id}`)}
          style={styles.preview}
        />
      </>
    );
    actions = (
      <Button title="Publiser siden" icon="globe-outline" disabled={!canPublish} loading={publishing} onPress={publish} />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {index > 0 ? (
          <IconButton icon="chevron-back" variant="soft" size={38} onPress={() => setIndex(index - 1)} accessibilityLabel="Forrige steg" />
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <View style={styles.progress} accessibilityLabel={`Steg ${index + 1} av ${STEPS.length}`}>
          {STEPS.map((item, i) => (
            <View key={item} style={[styles.segment, i <= index && styles.segmentDone]} />
          ))}
        </View>
        <Button title="Senere" variant="ghost" size="sm" onPress={() => router.replace('/business/salon')} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View key={step} entering={FadeIn.duration(250)} style={styles.step}>
          <View style={styles.icon}>
            <Ionicons name={icon} size={28} color={colors.primaryDark} />
          </View>
          <Text variant="overline" color={colors.primary}>Steg {index + 1} av {STEPS.length}</Text>
          <Text variant="display">{title}</Text>
          <Text variant="body" color={colors.textSecondary}>{text}</Text>
          {body}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  headerSpacer: { width: 38 },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  segmentDone: { backgroundColor: colors.primary },
  content: { padding: 24, paddingBottom: 32, width: '100%', maxWidth: 560, alignSelf: 'center' },
  step: { gap: 10 },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  card: { marginTop: 10, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden', ...shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  photos: { flexDirection: 'row', gap: 8, marginTop: 10 },
  photo: { flex: 1, aspectRatio: 1, maxWidth: 120, borderRadius: radius.md, backgroundColor: colors.divider },
  checks: { paddingHorizontal: 16, paddingVertical: 8 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  preview: { alignSelf: 'flex-start', marginTop: 6 },
  footer: {
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  doneContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  doneCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    boxShadow: '0px 12px 30px rgba(31, 157, 99, 0.35)',
  },
});
