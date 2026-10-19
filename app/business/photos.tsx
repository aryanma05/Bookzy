import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { FormScreen } from '@/components/business/form-screen';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { colors, fonts, radius } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import { deleteSalonPhoto, MAX_PHOTOS, uploadSalonPhoto } from '@/lib/photos';

type Upload = { done: number; total: number };

export default function PhotosScreen() {
  const { salon, saveSalon } = useBusiness();
  const [upload, setUpload] = useState<Upload | null>(null);
  const [saving, setSaving] = useState(false);

  if (!salon) return null;

  const photos = salon.photos;
  const room = MAX_PHOTOS - photos.length;
  const busy = upload !== null || saving;

  const save = async (next: string[]) => {
    setSaving(true);
    try {
      await saveSalon({ photos: next });
      haptics.success();
      return true;
    } catch (error) {
      console.error('Kunne ikke lagre bildene:', error);
      showAlert('Noe gikk galt', 'Kunne ikke lagre endringen. Prøv igjen.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addPhotos = async () => {
    // Noen nettlesere sier ikke fra når eieren lukker vinduet, så opplastingen vises først når bildene er valgt
    const result = await launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: room,
    });
    if (result.canceled || result.assets.length === 0) return;
    const assets = result.assets.slice(0, room);

    const uploaded: string[] = [];
    setUpload({ done: 0, total: assets.length });
    try {
      for (const asset of assets) {
        uploaded.push(await uploadSalonPhoto(salon.id, asset));
        setUpload({ done: uploaded.length, total: assets.length });
      }
    } catch (error) {
      console.error('Kunne ikke laste opp bildet:', error);
      showAlert(
        'Noe gikk galt',
        uploaded.length > 0
          ? `${uploaded.length} av ${assets.length} bilder ble lastet opp. Prøv igjen med resten.`
          : 'Kunne ikke laste opp bildet. Prøv igjen, eller velg et annet bilde (JPG eller PNG).'
      );
    }
    setUpload(null);
    if (uploaded.length > 0 && !(await save([...photos, ...uploaded]))) {
      uploaded.forEach((url) => deleteSalonPhoto(url).catch(() => {}));
    }
    if (result.assets.length > room) {
      showAlert('Noen bilder ble ikke lagt til', `Du kan ha opptil ${MAX_PHOTOS} bilder.`);
    }
  };

  const makeCover = (url: string) => save([url, ...photos.filter((photo) => photo !== url)]);

  const remove = (url: string) =>
    showAlert('Fjerne bildet?', 'Bildet forsvinner fra siden din.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Fjern',
        style: 'destructive',
        onPress: async () => {
          if (!(await save(photos.filter((photo) => photo !== url)))) return;
          // Siden er allerede oppdatert. Blir filen liggende, merker ingen kunder det.
          deleteSalonPhoto(url).catch((error) => console.warn('Kunne ikke slette bildefilen:', error));
        },
      },
    ]);

  const footer = (
    <Button
      title={upload ? `Laster opp ${upload.done + 1} av ${upload.total} …` : 'Legg til bilder'}
      icon={upload ? undefined : 'add'}
      disabled={busy || room <= 0}
      onPress={addPhotos}
      style={styles.flex}
    />
  );

  return (
    <FormScreen title="Bilder" subtitle={`${photos.length} av ${MAX_PHOTOS}`} footer={footer}>
      {photos.length === 0 && !upload ? (
        <EmptyState
          icon="images-outline"
          title="Ingen bilder ennå"
          message="Kundene booker heller når de ser arbeidet ditt. Legg inn bilder av det du har gjort, og gjerne av stedet."
        />
      ) : (
        <>
          <Text variant="caption">
            Det første bildet er forsidebildet. Det vises øverst på siden din og når kundene søker.
            {room <= 0 ? ` Du kan ha opptil ${MAX_PHOTOS} bilder, så fjern ett for å legge inn et nytt.` : ''}
          </Text>
          <View style={styles.grid}>
            {photos.map((url, index) => (
              <View key={url} style={styles.tile}>
                <Image source={{ uri: url }} style={styles.image} contentFit="cover" transition={200} />
                {index === 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Forsidebilde</Text>
                  </View>
                )}
                <View style={styles.actions}>
                  {index > 0 && (
                    <IconButton
                      icon="star-outline"
                      size={36}
                      accessibilityLabel="Bruk som forsidebilde"
                      onPress={busy ? undefined : () => makeCover(url)}
                    />
                  )}
                  <IconButton
                    icon="trash-outline"
                    size={36}
                    color={colors.danger}
                    accessibilityLabel="Fjern bildet"
                    onPress={busy ? undefined : () => remove(url)}
                  />
                </View>
              </View>
            ))}
            {upload &&
              Array.from({ length: upload.total - upload.done }, (_, index) => (
                <View key={`upload-${index}`} style={[styles.tile, styles.pending]}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ))}
          </View>
        </>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: { width: '48.5%', aspectRatio: 4 / 3, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.divider },
  image: { width: '100%', height: '100%' },
  pending: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12, color: '#FFFFFF' },
  actions: { position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', gap: 8 },
});
