import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
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
import { deleteSalonPhoto, THUMBNAIL_SIDE, uploadSalonPhoto } from '@/lib/photos';
import { formatDuration, SERVICE_GROUPS, shortId, type Service } from '@/lib/salons';
import { SLOT_INTERVAL_MIN } from '@/lib/schedule';

const MIN_DURATION = 5;
const MAX_DURATION = 8 * 60;

export default function EditServiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { salon, saveSalon } = useBusiness();
  const isNew = id === 'new';
  const existing = salon?.services.find((service) => service.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [durationMin, setDurationMin] = useState(existing?.durationMin ?? 60);
  // Det eieren skriver i minuttfeltet, til +/– brukes igjen. Kan være tomt mens de skriver.
  const [minutesInput, setMinutesInput] = useState<string | null>(null);
  const [price, setPrice] = useState(existing ? String(existing.priceNok) : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
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

  // Lukene er på 30 minutter, så en behandling på 50 min holder av en hel time i kalenderen
  const blockedMin = Math.ceil(durationMin / SLOT_INTERVAL_MIN) * SLOT_INTERVAL_MIN;

  const done = () => (router.canGoBack() ? router.back() : router.replace('/business/services'));

  const pickImage = async () => {
    const result = await launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      // shortcut: lagres ikke tjenesten etterpå, blir filen liggende i Storage. Rydd med et script hvis det blir mange.
      setImageUrl(await uploadSalonPhoto(salon.id, result.assets[0], THUMBNAIL_SIDE));
    } catch (uploadError) {
      console.error('Kunne ikke laste opp bildet:', uploadError);
      showAlert('Noe gikk galt', 'Kunne ikke laste opp bildet. Prøv igjen, eller velg et annet bilde (JPG eller PNG).');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Gi tjenesten et navn.');
      return;
    }
    if (minutesInput === '' || durationMin < MIN_DURATION || durationMin > MAX_DURATION) {
      setError(`Varigheten må være mellom ${MIN_DURATION} minutter og ${formatDuration(MAX_DURATION)}.`);
      return;
    }
    if (!price) {
      setError('Skriv inn prisen.');
      return;
    }
    setError(null);
    setSaving(true);
    const service: Service = {
      id: existing?.id ?? shortId(),
      name: name.trim(),
      category: category.trim() || 'Behandlinger',
      durationMin,
      priceNok: Number(price),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    };
    try {
      await saveSalon({
        services: existing
          ? salon.services.map((item) => (item.id === existing.id ? service : item))
          : [...salon.services, service],
      });
      if (existing?.imageUrl && existing.imageUrl !== imageUrl) {
        deleteSalonPhoto(existing.imageUrl).catch((deleteError) => console.warn('Kunne ikke slette bildefilen:', deleteError));
      }
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
              if (existing.imageUrl) deleteSalonPhoto(existing.imageUrl).catch(() => {});
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
          <Button title="Lagre" loading={saving} disabled={uploading} onPress={save} style={styles.flex} />
        </>
      }
    >
      <TextField label="Navn" placeholder="F.eks. Gelénegler" value={name} onChangeText={setName} maxLength={60} />

      <FieldGroup label="Bilde (valgfritt)" hint="Vises ved siden av tjenesten på siden din.">
        <View style={styles.imageRow}>
          <View style={styles.thumbnail}>
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.thumbnailImage} contentFit="cover" transition={200} />
            ) : (
              <Ionicons name="image-outline" size={26} color={colors.textMuted} />
            )}
          </View>
          <Button
            title={imageUrl ? 'Bytt bilde' : 'Velg bilde'}
            variant="secondary"
            size="sm"
            icon="image-outline"
            disabled={uploading}
            onPress={pickImage}
          />
          {imageUrl && !uploading && <Button title="Fjern" variant="ghost" size="sm" onPress={() => setImageUrl(null)} />}
        </View>
      </FieldGroup>

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

      <FieldGroup
        label="Varighet"
        hint={
          blockedMin !== durationMin
            ? `Kundene kan booke hver halve time, så ${formatDuration(durationMin)} holder av ${formatDuration(blockedMin)} i kalenderen.`
            : 'Bruk + og – for et kvarter av gangen, eller skriv inn antall minutter.'
        }
      >
        <Stepper
          value={durationMin}
          onChange={(value) => {
            setDurationMin(value);
            setMinutesInput(null);
          }}
          step={15}
          min={15}
          max={MAX_DURATION}
          format={formatDuration}
        />
        <TextField
          icon="time-outline"
          placeholder="Antall minutter, f.eks. 50"
          value={minutesInput ?? String(durationMin)}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, '');
            setMinutesInput(digits);
            if (digits) setDurationMin(Number(digits));
          }}
          keyboardType="number-pad"
          maxLength={3}
          accessibilityLabel="Varighet i minutter"
        />
      </FieldGroup>

      <TextField
        label="Pris (kr)"
        placeholder="0"
        value={price}
        // Bare hele kroner, så bokstaver, mellomrom og komma tas bort med en gang
        onChangeText={(text) => setPrice(text.replace(/\D/g, ''))}
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
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.divider,
  },
  thumbnailImage: { width: '100%', height: '100%' },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
});
