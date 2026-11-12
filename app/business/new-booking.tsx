import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DateStrip, StaffPicker, TimeGrid } from '@/components/booking-pickers';
import { FormScreen } from '@/components/business/form-screen';
import { FieldGroup } from '@/components/business/salon-fields';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, radius } from '@/constants/theme';
import { SlotTakenError, useBookings } from '@/context/BookingContext';
import { useBusiness } from '@/context/BusinessContext';
import { useNow } from '@/hooks/use-now';
import { useTakenSlots } from '@/hooks/use-taken-slots';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import { toE164 } from '@/lib/phone';
import { formatDuration, formatPrice, MAX_ADD_ONS, withAddOns } from '@/lib/salons';
import { formatDay, formatMonth, fromDateKey, getAvailableTimes, hoursForDate, toDateKey, upcomingDates } from '@/lib/schedule';

// Lenger frem enn kundene kan booke selv, så neste time kan avtales før kunden går
const DAYS_AHEAD = 56;

/** Eieren legger inn en time selv, for kunder som booker på telefon eller melding. Tiden blir opptatt for alle andre. */
export default function NewBookingScreen() {
  const router = useRouter();
  const now = useNow();
  const params = useLocalSearchParams<{ date?: string }>();
  const { salon } = useBusiness();
  const { createBooking } = useBookings();

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  // Starter på dagen som var åpen i kalenderen
  const [chosenDate, setChosenDate] = useState(params.date ?? null);
  const [chosenTime, setChosenTime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dates = upcomingDates(now, DAYS_AHEAD);
  const dateKey = dates.map(toDateKey).find((key) => key === chosenDate) ?? toDateKey(now);
  const { taken, error: slotsError } = useTakenSlots(salon?.id ?? null, dateKey);

  if (!salon) return null;

  const services = salon.services.filter((item) => !item.addOn);
  const service = services.find((item) => item.id === serviceId) ?? services[0];

  if (!service) {
    return (
      <FormScreen title="Ny time" backTo="/business/calendar">
        <EmptyState
          icon="pricetags-outline"
          title="Legg til en tjeneste først"
          message="Varigheten på tjenesten bestemmer hvor mye av kalenderen timen tar."
          actionLabel="Til tjenester"
          onAction={() => router.navigate('/business/services')}
        />
      </FormScreen>
    );
  }

  const addOns = salon.services.filter((item) => item.addOn);
  const chosenAddOns = addOns.filter((item) => addOnIds.includes(item.id));
  const total = withAddOns(service, chosenAddOns);
  const date = fromDateKey(dateKey);
  const available = taken
    ? getAvailableTimes({
        openingHours: salon.openingHours,
        closedDates: salon.closedDates,
        date,
        durationMin: total.durationMin,
        staffIds: staffId ? [staffId] : salon.staff.map((member) => member.id),
        taken,
        now,
        // Kunden kan stå i døra, så timen kan starte med en gang
        leadMin: 0,
      })
    : [];
  const time = chosenTime && available.some((item) => item.time === chosenTime) ? chosenTime : null;

  const toggleAddOn = (id: string) => {
    if (!addOnIds.includes(id) && chosenAddOns.length >= MAX_ADD_ONS) return;
    setAddOnIds(addOnIds.includes(id) ? addOnIds.filter((item) => item !== id) : [...addOnIds, id]);
  };

  const save = async () => {
    if (saving) return;
    const missing = !time ? 'Velg et tidspunkt.' : !name.trim() ? 'Skriv inn navnet på kunden.' : null;
    setError(missing);
    if (!time || missing) return;
    setSaving(true);
    try {
      await createBooking({
        salon,
        service,
        addOns: chosenAddOns,
        staffId,
        date: dateKey,
        time,
        name,
        phone: toE164(phone) ?? phone,
        note,
        manual: true,
      });
      haptics.success();
      if (router.canGoBack()) router.back();
      else router.replace('/business/calendar');
      showAlert('Timen er lagt inn', `${name.trim()}, ${formatDay(date, now).toLowerCase()} kl ${time}.`);
    } catch (saveError) {
      haptics.warning();
      setSaving(false);
      if (saveError instanceof SlotTakenError) {
        showAlert('Tiden ble nettopp tatt', 'En kunde rakk å booke denne tiden. Velg en annen tid.');
      } else {
        console.error('Kunne ikke legge inn timen:', saveError);
        showAlert('Noe gikk galt', 'Kunne ikke legge inn timen. Sjekk nettet og prøv igjen.');
      }
    }
  };

  return (
    <FormScreen
      title="Ny time"
      backTo="/business/calendar"
      footer={<Button title="Legg inn timen" loading={saving} onPress={save} style={styles.flex} />}
    >
      <Text variant="body" color={colors.textSecondary}>
        For kunder som booker på telefon eller melding. Tiden blir opptatt for andre, og kunden får ingen varsler fra Bookzy.
      </Text>

      {services.length > 1 && (
        <FieldGroup label="Tjeneste">
          <View style={styles.chips}>
            {services.map((item) => (
              <Chip key={item.id} label={item.name} selected={item.id === service.id} onPress={() => setServiceId(item.id)} />
            ))}
          </View>
        </FieldGroup>
      )}

      {addOns.length > 0 && (
        <FieldGroup label="Tillegg">
          <View style={styles.chips}>
            {addOns.map((item) => (
              <Chip key={item.id} label={item.name} selected={addOnIds.includes(item.id)} onPress={() => toggleAddOn(item.id)} />
            ))}
          </View>
        </FieldGroup>
      )}

      <Text variant="label">
        {total.name} · {formatDuration(total.durationMin)} · {formatPrice(total.priceNok)}
      </Text>

      {salon.staff.length > 1 && (
        <FieldGroup label="Hos">
          <View style={styles.bleed}>
            <StaffPicker staff={salon.staff} selectedId={staffId} onSelect={setStaffId} />
          </View>
        </FieldGroup>
      )}

      <FieldGroup label={formatMonth(date)}>
        <View style={styles.bleed}>
          <DateStrip
            dates={dates}
            selectedKey={dateKey}
            isClosed={(day) => !hoursForDate(salon.openingHours, day, salon.closedDates)}
            onSelect={setChosenDate}
          />
        </View>
      </FieldGroup>

      <FieldGroup label={`Ledige tider ${formatDay(date, now).toLowerCase()}`}>
        {slotsError ? (
          <Text variant="body" color={colors.danger}>Kunne ikke hente ledige tider. Sjekk nettet og prøv igjen.</Text>
        ) : taken === null ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : available.length === 0 ? (
          <Text variant="body" color={colors.textMuted}>
            Ingen ledige tider denne dagen. Timer legges innenfor åpningstidene dine.
          </Text>
        ) : (
          <TimeGrid times={available} selected={time} onSelect={setChosenTime} />
        )}
      </FieldGroup>

      <TextField
        label="Kundens navn"
        icon="person-outline"
        placeholder="Fornavn og etternavn"
        value={name}
        onChangeText={setName}
        maxLength={80}
        hint="Skal du bare holde av tiden selv, kan du skrive f.eks. «Privat»."
      />
      <TextField
        label="Mobilnummer (valgfritt)"
        icon="call-outline"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={20}
      />
      <TextField label="Notat (valgfritt)" value={note} onChangeText={setNote} multiline maxLength={500} />

      {error && (
        <View style={styles.error}>
          <Text variant="caption" color={colors.danger}>{error}</Text>
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Radene skroller sidelengs helt ut til kanten av skjemaet
  bleed: { marginHorizontal: -20 },
  loading: { alignSelf: 'flex-start' },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
});
