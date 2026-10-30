import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateStrip, StaffPicker, TimeGrid } from '@/components/booking-pickers';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/context/BookingContext';
import { useSalons } from '@/context/SalonsContext';
import { useNow } from '@/hooks/use-now';
import { useTakenSlots } from '@/hooks/use-taken-slots';
import { smsSignInSupported } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { formatDuration, formatPrice, withAddOns } from '@/lib/salons';
import {
  addDays,
  formatDay,
  formatMonth,
  fromDateKey,
  getAvailableTimes,
  hoursForDate,
  isDayOff,
  REQUEST_LEAD_HOURS,
  toDateKey,
  upcomingDates,
} from '@/lib/schedule';

const DAYS_AHEAD = 28;

export default function ChooseTimeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    salonId: string;
    serviceId: string;
    staffId?: string;
    replaces?: string;
    /** Kommaseparert. Satt når kunden flytter eller booker igjen en time med tillegg. */
    addOnIds?: string;
  }>();
  const now = useNow();
  const { user } = useAuth();
  const { bookings } = useBookings();
  const { getSalon, loading } = useSalons();

  const salon = getSalon(params.salonId);
  const service = salon?.services.find((item) => item.id === params.serviceId);
  // Skjulte salonger tar ikke imot nye bookinger (f.eks. fra «Book igjen»), men eieren kan prøve sin egen side
  const hidden = !!salon && !salon.published && salon.ownerId !== user?.uid;
  const replacing = params.replaces ? bookings.find((booking) => booking.id === params.replaces) : undefined;

  const [staffId, setStaffId] = useState<string | null>(params.staffId || null);
  const [addOnIds, setAddOnIds] = useState(() => params.addOnIds?.split(',').filter(Boolean) ?? []);
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [chosenTime, setChosenTime] = useState<string | null>(null);

  const dates = upcomingDates(now, DAYS_AHEAD);
  const firstOpen = salon ? dates.find((date) => hoursForDate(salon.openingHours, date, salon.closedDates)) : undefined;
  const dateKey = chosenDate ?? toDateKey(firstOpen ?? now);
  const date = fromDateKey(dateKey);
  const { taken, error } = useTakenSlots(salon?.id ?? null, dateKey);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!salon || !service || hidden) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Velg tid" />
        <EmptyState
          icon="alert-circle-outline"
          title={hidden ? 'Salongen tar ikke imot bookinger nå' : 'Fant ikke tjenesten'}
          actionLabel="Tilbake"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const addOns = salon.services.filter((item) => item.addOn);
  // Tillegg salongen har slettet siden timen ble booket, faller bort
  const chosenAddOns = addOns.filter((item) => addOnIds.includes(item.id));
  const total = withAddOns(service, chosenAddOns);
  const staffIds = staffId ? [staffId] : salon.staff.map((member) => member.id);
  const available =
    taken !== null
      ? getAvailableTimes({
          openingHours: salon.openingHours,
          closedDates: salon.closedDates,
          date,
          durationMin: total.durationMin,
          staffIds,
          taken,
          now,
          leadMin: salon.requiresApproval ? REQUEST_LEAD_HOURS * 60 : undefined,
        })
      : [];
  const time = chosenTime && available.some((item) => item.time === chosenTime) ? chosenTime : null;
  const isClosed = !hoursForDate(salon.openingHours, date, salon.closedDates);
  const chosenStaff = staffId ? salon.staff.find((member) => member.id === staffId) : undefined;
  const chosenStaffOff = !!chosenStaff && isDayOff(salon.closedDates, dateKey, chosenStaff.id);

  const goToNextDay = () => {
    setChosenDate(toDateKey(addDays(date, 1)));
    setChosenTime(null);
  };

  const proceed = () => {
    if (!time) return;
    // På nettet bekrefter kunden nummeret med SMS på neste side, uten å lage konto først
    if (!user && !smsSignInSupported) {
      router.push('/login');
      return;
    }
    router.push({
      pathname: '/book/confirm',
      params: {
        salonId: salon.id,
        serviceId: service.id,
        staffId: staffId ?? '',
        date: dateKey,
        time,
        ...(replacing ? { replaces: replacing.id } : {}),
        ...(chosenAddOns.length > 0 ? { addOnIds: chosenAddOns.map((item) => item.id).join(',') } : {}),
      },
    });
  };

  const toggleAddOn = (id: string) => {
    haptics.select();
    setAddOnIds(addOnIds.includes(id) ? addOnIds.filter((item) => item !== id) : [...addOnIds, id]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={replacing ? 'Velg ny tid' : 'Velg tid'} subtitle={salon.name} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.serviceCard}>
          <View style={styles.serviceText}>
            <Text variant="subheading">{service.name}</Text>
            <Text variant="caption">{formatDuration(service.durationMin)} · {formatPrice(service.priceNok)}</Text>
          </View>
          {!replacing && <Button title="Endre" size="sm" variant="ghost" onPress={() => router.back()} />}
        </View>

        {addOns.length > 0 && (
          <View style={styles.section}>
            <Text variant="heading" style={styles.sectionTitle}>Vil du legge til noe?</Text>
            <View style={styles.addOns}>
              {addOns.map((addOn, index) => {
                const checked = addOnIds.includes(addOn.id);
                return (
                  <Pressable
                    key={addOn.id}
                    onPress={() => toggleAddOn(addOn.id)}
                    style={[styles.addOn, index > 0 && styles.addOnDivider]}
                    accessibilityRole="checkbox"
                    // accessibilityState når ikke frem på nettet, aria-checked virker begge steder
                    aria-checked={checked}
                  >
                    <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
                    <View style={styles.serviceText}>
                      <Text variant="bodyStrong">{addOn.name}</Text>
                      {addOn.description ? <Text variant="caption">{addOn.description}</Text> : null}
                    </View>
                    <View style={styles.addOnPrice}>
                      <Text variant="label">+{formatPrice(addOn.priceNok)}</Text>
                      {addOn.durationMin > 0 && (
                        <Text variant="caption" color={colors.textMuted}>+{formatDuration(addOn.durationMin)}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {salon.staff.length > 1 && (
          <View style={styles.section}>
            <Text variant="heading" style={styles.sectionTitle}>Hvem vil du gå til?</Text>
            <StaffPicker
              staff={salon.staff}
              selectedId={staffId}
              onSelect={(id) => {
                setStaffId(id);
                setChosenTime(null);
              }}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text variant="heading" style={styles.sectionTitle}>{formatMonth(date)}</Text>
          <DateStrip
            dates={dates}
            selectedKey={dateKey}
            isClosed={(day) => !hoursForDate(salon.openingHours, day, salon.closedDates)}
            onSelect={(key) => {
              setChosenDate(key);
              setChosenTime(null);
            }}
          />
        </View>

        <View style={[styles.section, styles.times]}>
          <Text variant="heading">Ledige tider {formatDay(date, now).toLowerCase()}</Text>
          {salon.requiresApproval && (
            <Text variant="caption">
              {salon.name} godkjenner bookingene selv, så du kan bare be om tider minst {REQUEST_LEAD_HOURS} timer frem.
            </Text>
          )}
          {isClosed ? (
            <EmptyState
              icon="moon-outline"
              title="Stengt denne dagen"
              actionLabel="Se neste dag"
              onAction={goToNextDay}
            />
          ) : error ? (
            <Text variant="body" color={colors.danger}>Kunne ikke hente ledige tider. Sjekk nettet og prøv igjen.</Text>
          ) : taken === null ? (
            <ActivityIndicator color={colors.primary} style={styles.timesLoading} />
          ) : available.length === 0 ? (
            <EmptyState
              icon="calendar-clear-outline"
              title={chosenStaff && chosenStaffOff ? `${chosenStaff.name.split(' ')[0]} har fri denne dagen` : 'Fullt denne dagen'}
              message={staffId ? 'Prøv en annen dag, eller velg «Hvem som helst».' : 'Prøv en annen dag.'}
              actionLabel="Se neste dag"
              onAction={goToNextDay}
            />
          ) : (
            <TimeGrid times={available} selected={time} onSelect={setChosenTime} />
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.footerText}>
          <Text variant="label">{time ? `${formatDay(date, now)} kl ${time}` : 'Velg et tidspunkt'}</Text>
          <Text variant="caption">{formatPrice(total.priceNok)} · betales i salongen</Text>
        </View>
        <Button title={user || smsSignInSupported ? 'Fortsett' : 'Logg inn'} disabled={!time} onPress={proceed} style={styles.footerButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: 20, paddingBottom: 40 },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceText: { flex: 1, gap: 2 },
  addOns: {
    marginHorizontal: 20,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addOn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  addOnDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  addOnPrice: { alignItems: 'flex-end' },
  section: { marginTop: 26 },
  sectionTitle: { paddingHorizontal: 20, marginBottom: 14 },
  times: { paddingHorizontal: 20, gap: 16 },
  timesLoading: { alignSelf: 'flex-start' },
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
  footerText: { flex: 1, gap: 2 },
  footerButton: { minWidth: 140 },
});
