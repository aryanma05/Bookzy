import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FormScreen } from '@/components/business/form-screen';
import { FieldGroup } from '@/components/business/salon-fields';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Stepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, radius } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import { formatDuration, SERVICE_GROUPS, shortId, type Service } from '@/lib/salons';

export default function EditServiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { salon, saveSalon } = useBusiness();
  const isNew = id === 'new';
  const existing = salon?.services.find((service) => service.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [durationMin, setDurationMin] = useState(existing?.durationMin ?? 60);
  const [price, setPrice] = useState(existing ? String(existing.priceNok) : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!salon) return null;

  if (!isNew && !existing) {
    return (
      <FormScreen title="Tjeneste" backTo="/business/services">
        <EmptyState icon="pricetags-outline" title="Fant ikke tjenesten" message="Den kan ha blitt slettet." />
      </FormScreen>
    );
  }

  const suggestions = [
    ...new Set([...salon.services.map((service) => service.category), ...(SERVICE_GROUPS[salon.category] ?? [])]),
  ].filter(Boolean);

  const done = () => (router.canGoBack() ? router.back() : router.replace('/business/services'));

  const save = async () => {
    const priceNok = Number(price.replace(/\s/g, '').replace(',', '.'));
    if (!name.trim()) {
      setError('Gi tjenesten et navn.');
      return;
    }
    if (!price.trim() || !Number.isFinite(priceNok) || priceNok < 0) {
      setError('Skriv inn en gyldig pris.');
      return;
    }
    setError(null);
    setSaving(true);
    const service: Service = {
      id: existing?.id ?? shortId(),
      name: name.trim(),
      category: category.trim() || 'Behandlinger',
      durationMin,
      priceNok: Math.round(priceNok),
      ...(description.trim() ? { description: description.trim() } : {}),
    };
    try {
      await saveSalon({
        services: existing
          ? salon.services.map((item) => (item.id === existing.id ? service : item))
          : [...salon.services, service],
      });
      haptics.success();
      done();
    } catch (saveError) {
      console.error('Kunne ikke lagre tjenesten:', saveError);
      showAlert('Noe gikk galt', 'Kunne ikke lagre tjenesten. Prøv igjen.');
      setSaving(false);
    }
  };

  const remove = () => {
    if (!existing) return;
    const isLast = salon.services.length === 1 && salon.published;
    showAlert(
      `Slette ${existing.name}?`,
      isLast
        ? 'Dette er den eneste tjenesten din, så kundene kan ikke booke noe før du legger til en ny. Timer som er booket, påvirkes ikke.'
        : 'Kundene kan ikke lenger booke den. Timer som allerede er booket, påvirkes ikke.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await saveSalon({ services: salon.services.filter((item) => item.id !== existing.id) });
              done();
            } catch (deleteError) {
              console.error('Kunne ikke slette tjenesten:', deleteError);
              showAlert('Noe gikk galt', 'Kunne ikke slette tjenesten. Prøv igjen.');
            }
          },
        },
      ]
    );
  };

  return (
    <FormScreen
      title={isNew ? 'Ny tjeneste' : 'Endre tjeneste'}
      backTo="/business/services"
      footer={
        <>
          {existing && <Button title="Slett" variant="danger" onPress={remove} style={styles.deleteButton} />}
          <Button title="Lagre" loading={saving} onPress={save} style={styles.flex} />
        </>
      }
    >
      <TextField label="Navn" placeholder="F.eks. Gelénegler" value={name} onChangeText={setName} maxLength={60} />

      <FieldGroup label="Gruppe" hint="Tjenestene vises samlet i grupper på siden din.">
        <TextField placeholder="F.eks. Manikyr" value={category} onChangeText={setCategory} maxLength={40} />
        {suggestions.length > 0 && (
          <View style={styles.chips}>
            {suggestions.map((suggestion) => (
              <Chip
                key={suggestion}
                label={suggestion}
                selected={suggestion === category.trim()}
                onPress={() => setCategory(suggestion)}
              />
            ))}
          </View>
        )}
      </FieldGroup>

      <Stepper
        label="Varighet"
        value={durationMin}
        onChange={setDurationMin}
        step={15}
        min={15}
        max={8 * 60}
        format={formatDuration}
      />

      <TextField
        label="Pris (kr)"
        placeholder="0"
        value={price}
        onChangeText={setPrice}
        keyboardType="number-pad"
        maxLength={7}
      />

      <TextField
        label="Beskrivelse (valgfritt)"
        placeholder="Hva er inkludert, hvor lenge holder det …"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={200}
      />

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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
});
