import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ConfirmationResult } from 'firebase/auth';
import { SalonPhoto } from '@/components/salon-photo';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, radius, shadows } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { SlotTakenError, useBookings } from '@/context/BookingContext';
import { useSalons } from '@/context/SalonsContext';
import { useNow } from '@/hooks/use-now';
import { showAlert } from '@/lib/alert';
import { sendSmsCode, smsSignInSupported } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { formatPhone, toE164 } from '@/lib/phone';
import { displayAddress, formatCancellationPolicy, formatDuration, formatPrice, withAddOns } from '@/lib/salons';
import { formatDay, formatShortDate, fromDateKey, REQUEST_LEAD_HOURS, toMinutes, toStartDate, toTime } from '@/lib/schedule';

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={19} color={colors.primary} />
      <View style={styles.detailText}>
        <Text variant="caption" color={colors.textMuted}>{label}</Text>
        <Text variant="bodyStrong">{value}</Text>
      </View>
    </View>
  );
}

export default function ConfirmBookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const params = useLocalSearchParams<{
    salonId: string;
    serviceId: string;
    staffId?: string;
    date: string;
    time: string;
    replaces?: string;
    addOnIds?: string;
  }>();
  const { user, profile, displayName, saveProfile, confirmSmsCode } = useAuth();
  const { bookings, createBooking } = useBookings();
  const { getSalon } = useSalons();

  const salon = getSalon(params.salonId);
  const service = salon?.services.find((item) => item.id === params.serviceId);
  const staff = salon?.staff.find((member) => member.id === params.staffId);
  const addOnIds = params.addOnIds?.split(',') ?? [];
  const addOns = salon?.services.filter((item) => item.addOn && addOnIds.includes(item.id)) ?? [];
  const replacing = params.replaces ? bookings.find((booking) => booking.id === params.replaces) : undefined;

  const [nameInput, setNameInput] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const [code, setCode] = useState('');
  // Satt når koden er sendt til en kunde som ikke er logget inn
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [note, setNote] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; code?: string; terms?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  // Logget inn med SMS: nummeret er bekreftet og kan ikke endres her
  const verifiedPhone = user?.phoneNumber ?? null;
  const askName = !user || !displayName;
  const name = nameInput ?? displayName;
  const phone = verifiedPhone ?? phoneInput ?? profile?.phone ?? '';

  if (!salon || !service || !params.date || !params.time) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Bekreft" />
        <EmptyState icon="alert-circle-outline" title="Noe mangler" message="Gå tilbake og velg tid på nytt." actionLabel="Tilbake" onAction={() => router.back()} />
      </View>
    );
  }

  const date = fromDateKey(params.date);
  const total = withAddOns(service, addOns);
  const endTime = toTime(toMinutes(params.time) + total.durationMin);
  const startAt = toStartDate(params.date, params.time);
  const pastDeadline = startAt.getTime() - salon.cancellationHours * 60 * 60 * 1000 <= now.getTime();

  const confirm = async () => {
    if (submitting) return;
    if (!user && !smsSignInSupported) {
      router.push('/login');
      return;
    }
    const number = verifiedPhone ?? toE164(phone);
    const nextErrors = {
      name: askName && !name.trim() ? 'Skriv inn navnet ditt.' : undefined,
      phone: number ? undefined : 'Skriv inn et gyldig mobilnummer.',
      code: confirmation && !/^\d{6}$/.test(code.trim()) ? 'Skriv inn den sekssifrede koden fra SMS-en.' : undefined,
      terms: salon.terms && !acceptedTerms ? 'Du må godta vilkårene for å booke.' : undefined,
    };
    setErrors(nextErrors);
    if (!number || nextErrors.name || nextErrors.code || nextErrors.terms) return;
    // Tiden kan ha kommet for nær mens kunden fylte ut
    if (salon.requiresApproval && startAt.getTime() - now.getTime() < REQUEST_LEAD_HOURS * 60 * 60 * 1000) {
      showAlert('Tiden er for nær', `Forespørsler må sendes minst ${REQUEST_LEAD_HOURS} timer før timen. Velg en senere tid.`, [
        { text: 'Velg ny tid', onPress: () => router.back() },
      ]);
      return;
    }
    setSubmitting(true);
    try {
      if (!user) {
        if (!confirmation) {
          setConfirmation(await sendSmsCode(number));
          return;
        }
        await confirmSmsCode(confirmation, code, name);
      }
      const bookingId = await createBooking({
        salon,
        service,
        addOns,
        staffId: staff?.id ?? null,
        date: params.date,
        time: params.time,
        name,
        phone: number,
        note,
        replaces: replacing,
      });
      if (user && (number !== profile?.phone || name !== displayName)) {
        saveProfile({ name, phone: number }).catch(() => {});
      }
      haptics.success();
      router.replace({
        pathname: '/book/success',
        params: { bookingId, moved: replacing ? '1' : '', pending: salon.requiresApproval ? '1' : '' },
      });
    } catch (error) {
      haptics.warning();
      if ((error as { code?: string } | null)?.code?.startsWith('auth/')) {
        setErrors(confirmation ? { code: authErrorMessage(error) } : { phone: authErrorMessage(error) });
      } else if (error instanceof SlotTakenError) {
        showAlert('Tiden ble nettopp tatt', 'Noen andre rakk å booke denne tiden. Velg en annen tid.', [
          { text: 'Velg ny tid', onPress: () => router.back() },
        ]);
      } else {
        console.error('Kunne ikke lagre booking:', error);
        showAlert('Noe gikk galt', 'Kunne ikke fullføre bookingen. Sjekk nettet og prøv igjen.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={replacing ? 'Bekreft ny tid' : 'Bekreft booking'} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.salonCard}>
            <SalonPhoto salon={salon} style={styles.salonImage} iconSize={24} />
            <View style={styles.salonText}>
              <Text variant="subheading">{salon.name}</Text>
              <Text variant="caption">{displayAddress(salon)}</Text>
            </View>
          </View>

          {replacing && (
            <View style={styles.notice}>
              <Ionicons name="swap-horizontal" size={18} color={colors.primaryDark} />
              <Text variant="caption" color={colors.primaryDark} style={styles.noticeText}>
                Du flytter timen fra {formatShortDate(replacing.startAt)} kl {replacing.time}. Den gamle timen avbestilles automatisk.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <DetailRow icon="calendar-outline" label="Tid" value={`${formatDay(date, now)}, ${params.time}–${endTime}`} />
            <DetailRow icon="cut-outline" label="Behandling" value={`${total.name} (${formatDuration(total.durationMin)})`} />
            <DetailRow icon="person-outline" label="Hos" value={staff ? staff.name : 'Første ledige'} />
            <DetailRow icon="card-outline" label="Pris" value={`${formatPrice(total.priceNok)} · betales i salongen`} />
          </View>

          <View style={styles.fields}>
            {askName && (
              <TextField
                label="Navn"
                icon="person-outline"
                value={name}
                onChangeText={(value) => {
                  setNameInput(value);
                  setErrors({});
                }}
                autoComplete="name"
                textContentType="name"
                placeholder="Fornavn og etternavn"
                maxLength={80}
                error={errors.name}
              />
            )}
            <TextField
              label="Mobilnummer"
              icon="call-outline"
              value={verifiedPhone ? formatPhone(verifiedPhone) : phone}
              onChangeText={(value) => {
                setPhoneInput(value);
                setErrors({});
              }}
              editable={!verifiedPhone && !confirmation}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              placeholder="912 34 567"
              maxLength={20}
              error={errors.phone}
              hint={
                verifiedPhone
                  ? 'Bekreftet med SMS.'
                  : user
                    ? 'Salongen bruker nummeret hvis noe endrer seg.'
                    : 'Vi sender en kode på SMS for å bekrefte at nummeret er ditt.'
              }
            />
            {confirmation && (
              <View style={styles.codeField}>
                <TextField
                  label="Kode fra SMS"
                  icon="keypad-outline"
                  value={code}
                  onChangeText={(value) => {
                    setCode(value);
                    setErrors({});
                  }}
                  keyboardType="number-pad"
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  placeholder="123456"
                  maxLength={6}
                  autoFocus
                  error={errors.code}
                  hint={`Sendt til ${formatPhone(toE164(phone) ?? phone)}.`}
                />
                <Pressable
                  onPress={() => {
                    setConfirmation(null);
                    setCode('');
                    setErrors({});
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text variant="label" color={colors.primary}>Endre nummer eller send ny kode</Text>
                </Pressable>
              </View>
            )}
            <TextField
              label="Beskjed til salongen (valgfritt)"
              value={note}
              onChangeText={setNote}
              placeholder="F.eks. allergier eller ønsker"
              multiline
              maxLength={500}
            />
          </View>

          {salon.terms ? (
            <View style={styles.card}>
              <Text variant="subheading">Vilkår fra {salon.name}</Text>
              <Text variant="body" color={colors.textSecondary}>{salon.terms}</Text>
              <Pressable
                onPress={() => {
                  setAcceptedTerms(!acceptedTerms);
                  setErrors({});
                }}
                style={styles.checkRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedTerms }}
              >
                <Ionicons name={acceptedTerms ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
                <Text variant="bodyStrong" style={styles.noticeText}>Jeg har lest og godtar vilkårene</Text>
              </Pressable>
              {errors.terms && <Text variant="caption" color={colors.danger}>{errors.terms}</Text>}
            </View>
          ) : null}

          {salon.requiresApproval && (
            <View style={styles.notice}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryDark} />
              <Text variant="caption" color={colors.primaryDark} style={styles.noticeText}>
                {salon.name} godkjenner bookingene selv. Du ser svaret under Timer, og adressen vises når timen er godkjent.
              </Text>
            </View>
          )}

          {pastDeadline ? (
            <View style={[styles.notice, styles.warning]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
              <Text variant="caption" color={colors.text} style={styles.noticeText}>
                Timen er mindre enn {salon.cancellationHours} timer unna, så den kan ikke flyttes eller avbestilles i appen.
                Ring salongen hvis noe skulle skje.
              </Text>
            </View>
          ) : (
            <View style={styles.policy}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
              <Text variant="caption" style={styles.noticeText}>{formatCancellationPolicy(salon.cancellationHours)}</Text>
            </View>
          )}

          <Pressable onPress={() => router.push('/privacy')} hitSlop={8} accessibilityRole="link">
            <Text variant="caption" align="center">
              Ved å booke godtar du <Text variant="label" color={colors.primary}>vilkårene og personvernerklæringen</Text>.
            </Text>
          </Pressable>

          {!user && (
            <Pressable onPress={() => router.push('/login')} hitSlop={8} accessibilityRole="button" style={styles.login}>
              <Text variant="caption" align="center">
                Har du konto med e-post? <Text variant="label" color={colors.primary}>Logg inn</Text>
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.total}>
          <Text variant="caption">Totalt</Text>
          <Text variant="heading">{formatPrice(total.priceNok)}</Text>
        </View>
        <Button
          title={
            !user && !confirmation
              ? 'Send kode'
              : salon.requiresApproval
                ? 'Send forespørsel'
                : replacing
                  ? 'Bekreft ny tid'
                  : 'Bekreft booking'
          }
          onPress={confirm}
          loading={submitting}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  salonCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  salonImage: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.divider },
  salonText: { flex: 1, gap: 2 },
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  noticeText: { flex: 1 },
  warning: { backgroundColor: colors.warningSoft },
  card: { padding: 16, gap: 16, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
  detailText: { flex: 1 },
  fields: { gap: 16, marginTop: 4 },
  codeField: { gap: 10 },
  login: { paddingVertical: 4 },
  policy: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  total: { flex: 1 },
  footerButton: { minWidth: 180 },
});
