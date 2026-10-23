import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FormScreen } from '@/components/business/form-screen';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, radius } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { fetchUpcomingBookings } from '@/hooks/use-salon-bookings';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import { shortId } from '@/lib/salons';
import { toDateKey } from '@/lib/schedule';

export default function EditStaffScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { salon, saveSalon } = useBusiness();
  const isNew = id === 'new';
  const existing = salon?.staff.find((member) => member.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!salon) return null;

  if (!isNew && !existing) {
    return (
      <FormScreen title="Ansatt" backTo="/business/staff">
        <EmptyState icon="person-outline" title="Fant ikke personen" />
      </FormScreen>
    );
  }

  const done = () => (router.canGoBack() ? router.back() : router.replace('/business/staff'));

  const save = async () => {
    if (!name.trim()) {
      setError('Skriv inn navnet.');
      return;
    }
    setError(null);
    setSaving(true);
    const member = { id: existing?.id ?? shortId(), name: name.trim(), title: title.trim() };
    try {
      await saveSalon({
        staff: existing ? salon.staff.map((item) => (item.id === existing.id ? member : item)) : [...salon.staff, member],
      });
      haptics.success();
      done();
    } catch (saveError) {
      console.error('Kunne ikke lagre:', saveError);
      showAlert('Noe gikk galt', 'Kunne ikke lagre. Prøv igjen.');
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    if (salon.staff.length === 1) {
      showAlert('Kan ikke fjernes', 'Det må være minst én person kundene kan booke hos.');
      return;
    }
    setSaving(true);
    try {
      const upcoming = (await fetchUpcomingBookings(salon.id, toDateKey(new Date()))).filter(
        (booking) => booking.staffId === existing.id && booking.endAt.getTime() > Date.now()
      );
      setSaving(false);
      if (upcoming.length > 0) {
        showAlert(
          `${existing.name.split(' ')[0]} har ${upcoming.length} kommende ${upcoming.length === 1 ? 'time' : 'timer'}`,
          'Avbestill dem i kalenderen først, så kundene får beskjed.'
        );
        return;
      }
    } catch (checkError) {
      console.error('Kunne ikke sjekke kommende timer:', checkError);
      setSaving(false);
      showAlert('Noe gikk galt', 'Kunne ikke sjekke om personen har timer. Prøv igjen.');
      return;
    }

    showAlert(`Fjerne ${existing.name}?`, 'Kundene kan ikke lenger booke hos denne personen.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Fjern',
        style: 'destructive',
        onPress: async () => {
          try {
            await saveSalon({
              staff: salon.staff.filter((item) => item.id !== existing.id),
              // Fridagene til personen trengs ikke lenger
              closedDates: salon.closedDates.filter((key) => !key.endsWith(`_${existing.id}`)),
            });
            done();
          } catch (deleteError) {
            console.error('Kunne ikke fjerne:', deleteError);
            showAlert('Noe gikk galt', 'Prøv igjen.');
          }
        },
      },
    ]);
  };

  return (
    <FormScreen
      title={isNew ? 'Ny ansatt' : 'Endre ansatt'}
      backTo="/business/staff"
      footer={
        <>
          {existing && salon.staff.length > 1 && (
            <Button title="Fjern" variant="danger" onPress={remove} disabled={saving} style={styles.deleteButton} />
          )}
          <Button title="Lagre" loading={saving} onPress={save} style={styles.flex} />
        </>
      }
    >
      <View style={styles.avatar}>
        <Avatar name={name || '?'} size={76} />
      </View>
      <TextField label="Navn" icon="person-outline" value={name} onChangeText={setName} maxLength={60} placeholder="Fornavn og etternavn" />
      <TextField label="Tittel (valgfritt)" value={title} onChangeText={setTitle} maxLength={40} placeholder="F.eks. Frisør" />
      <Text variant="caption" color={colors.textMuted}>Kundene ser fornavnet og tittelen når de velger hvem de vil gå til.</Text>
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
  deleteButton: { minWidth: 110 },
  avatar: { alignItems: 'center', marginVertical: 4 },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
});
