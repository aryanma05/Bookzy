import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FormScreen } from '@/components/business/form-screen';
import { MonthCalendar } from '@/components/business/month-calendar';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { fetchUpcomingBookings } from '@/hooks/use-salon-bookings';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import type { Salon } from '@/lib/salons';
import { addDays, dayOffKey, formatDateRange, fromDateKey, hoursForDate, toDateKey } from '@/lib/schedule';

type Period = { staffId: string | null; from: string; to: string; keys: string[] };

/** Slår sammen dager som henger sammen, så en ferieuke vises som én linje. */
function toPeriods(closedDates: string[], today: string): Period[] {
  const periods: Period[] = [];
  const entries = closedDates
    .map((key) => ({ key, date: key.slice(0, 10), staffId: key.length > 10 ? key.slice(11) : null }))
    .filter((entry) => entry.date >= today)
    .sort((a, b) => (a.staffId ?? '').localeCompare(b.staffId ?? '') || a.date.localeCompare(b.date));

  for (const entry of entries) {
    const last = periods[periods.length - 1];
    if (last && last.staffId === entry.staffId && toDateKey(addDays(fromDateKey(last.to), 1)) === entry.date) {
      last.to = entry.date;
      last.keys.push(entry.key);
    } else {
      periods.push({ staffId: entry.staffId, from: entry.date, to: entry.date, keys: [entry.key] });
    }
  }
  return periods.sort((a, b) => a.from.localeCompare(b.from));
}

function staffName(salon: Salon, staffId: string | null) {
  if (!staffId) return salon.staff.length > 1 ? 'Hele salongen' : null;
  return salon.staff.find((member) => member.id === staffId)?.name ?? 'Tidligere ansatt';
}

export default function DaysOffScreen() {
  const router = useRouter();
  const { salon, saveSalon } = useBusiness();
  const [target, setTarget] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [saving, setSaving] = useState(false);

  if (!salon) return null;

  const today = toDateKey(new Date());
  const closedDates = draft ?? salon.closedDates;
  const multiStaff = salon.staff.length > 1;
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const toggle = (dateKey: string) => {
    const key = dayOffKey(dateKey, target);
    setDraft(closedDates.includes(key) ? closedDates.filter((item) => item !== key) : [...closedDates, key]);
  };

  const removePeriod = (period: Period) => {
    haptics.select();
    setDraft(closedDates.filter((key) => !period.keys.includes(key)));
  };

  const persist = async () => {
    setSaving(true);
    try {
      await saveSalon({ closedDates });
      haptics.success();
      if (router.canGoBack()) router.back();
      else router.replace('/business/salon');
    } catch (error) {
      console.error('Kunne ikke lagre fridager:', error);
      showAlert('Noe gikk galt', 'Kunne ikke lagre fridagene. Prøv igjen.');
      setSaving(false);
    }
  };

  // Timer som allerede er booket på nye fridager, avbestilles ikke av seg selv – si fra om dem
  const save = async () => {
    const added = closedDates.filter((key) => !salon.closedDates.includes(key));
    if (added.length === 0) return persist();

    setSaving(true);
    const dates = added.map((key) => key.slice(0, 10)).sort();
    let affected = 0;
    try {
      const bookings = await fetchUpcomingBookings(salon.id, dates[0], dates[dates.length - 1]);
      affected = bookings.filter(
        (booking) => added.includes(booking.date) || added.includes(dayOffKey(booking.date, booking.staffId))
      ).length;
    } catch (error) {
      console.warn('Kunne ikke sjekke bookinger på fridagene:', error);
    }
    setSaving(false);

    if (affected === 0) return persist();
    showAlert(
      `Du har ${affected} ${affected === 1 ? 'time' : 'timer'} på de nye fridagene`,
      'De blir ikke avbestilt automatisk. Åpne dem i kalenderen og avbestill, eller gi kunden beskjed.',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Lagre likevel', onPress: persist },
      ]
    );
  };

  const periods = toPeriods(closedDates, today);

  return (
    <FormScreen
      title="Fridager og ferie"
      footer={<Button title="Lagre" loading={saving} disabled={draft === null} onPress={save} style={styles.flex} />}
    >
      <Text variant="body" color={colors.textSecondary}>
        Trykk på dagene {multiStaff && target ? 'personen har fri' : 'du har fri'}. Kundene kan ikke booke disse dagene.
      </Text>

      {multiStaff && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Hele salongen" selected={target === null} onPress={() => setTarget(null)} />
          {salon.staff.map((member) => (
            <Chip
              key={member.id}
              label={member.name.split(' ')[0]}
              selected={target === member.id}
              onPress={() => setTarget(member.id)}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.card}>
        <MonthCalendar
          month={month}
          onChangeMonth={setMonth}
          canGoBack={month > currentMonth}
          isSelected={(dateKey) => closedDates.includes(dayOffKey(dateKey, target))}
          isDisabled={(date) => {
            const key = toDateKey(date);
            // Har hele salongen fri, gjelder det alle – da kan man ikke velge én person
            return key < today || (target !== null && closedDates.includes(key));
          }}
          isRegularlyClosed={(date) => !hoursForDate(salon.openingHours, date)}
          onToggle={toggle}
        />
        <Text variant="caption" color={colors.textMuted} style={styles.legend}>
          Overstrekte dager er stengt etter de faste åpningstidene.
        </Text>
      </View>

      <Text variant="heading" style={styles.heading}>Kommende fridager</Text>
      {periods.length === 0 ? (
        <Text variant="body" color={colors.textMuted}>Ingen lagt inn.</Text>
      ) : (
        <View style={styles.card}>
          {periods.map((period, index) => {
            const who = staffName(salon, period.staffId);
            return (
              <View key={`${period.staffId}_${period.from}`} style={[styles.period, index > 0 && styles.divider]}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{formatDateRange(fromDateKey(period.from), fromDateKey(period.to))}</Text>
                  {who && <Text variant="caption">{who}</Text>}
                </View>
                <IconButton
                  icon="close"
                  variant="soft"
                  size={32}
                  color={colors.textSecondary}
                  onPress={() => removePeriod(period)}
                  accessibilityLabel="Fjern"
                />
              </View>
            );
          })}
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { gap: 8 },
  card: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  legend: { marginTop: 8, textAlign: 'center' },
  heading: { marginTop: 8 },
  period: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
