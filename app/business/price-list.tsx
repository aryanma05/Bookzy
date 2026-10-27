import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Poster,
  posterContentHeight,
  POSTER_THEMES,
  PosterThemePicker,
  sharePoster,
  usePosterFonts,
} from '@/components/business/poster';
import { FieldGroup } from '@/components/business/salon-fields';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, fonts } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { haptics } from '@/lib/haptics';
import { salonLink } from '@/lib/links';
import { formatDuration, formatPrice, groupServices } from '@/lib/salons';

// Mindre enn dette blir vanskelig å lese i en story. Er det fortsatt for mye, blir bildet høyere enn 9:16.
const MIN_FIT = 0.75;

export default function PriceListScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { salon } = useBusiness();
  const posterRef = useRef<View>(null);
  const fontsReady = usePosterFonts();
  const [themeKey, setThemeKey] = useState(POSTER_THEMES[0].key);
  const [hidden, setHidden] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [sharing, setSharing] = useState(false);

  // shortcut: teksten lagres bare på denne enheten, legg den på salongen hvis eierne bruker flere enheter
  const noteKey = `timeflyt:priceListNote:${salon?.id}`;
  useEffect(() => {
    AsyncStorage.getItem(noteKey)
      .then((value) => value && setNote(value))
      .catch(() => {});
  }, [noteKey]);

  if (!salon) return null;

  const theme = POSTER_THEMES.find((item) => item.key === themeKey) ?? POSTER_THEMES[0];
  const posterWidth = Math.min(width - 32, 420);
  const link = salonLink(salon.id);
  // Lenken virker bare når siden er publisert
  const subtitle = salon.published && link ? link.replace(/^https:\/\//, '') : salon.area;
  const groups = groupServices(salon.services);
  const shown = groups.filter((group) => !hidden.includes(group.category));
  const info = note.trim();

  // Omtrent hvor høy lista blir i full størrelse (se stilene under), så teksten kan krympes til alt får plass i en story
  const natural =
    shown.reduce(
      (sum, group) =>
        sum +
        (theme.card ? 38 : 23) +
        group.services.reduce((rows, service) => rows + 58 + (Math.ceil(service.name.length / 28) - 1) * 21, 0),
      0
    ) +
    (shown.length - 1) * 18 +
    (info ? 18 + info.split('\n').reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / 42)), 0) * 19 : 0);
  const available = posterContentHeight(theme, posterWidth);
  const fit = Math.min(1, Math.max(MIN_FIT, available / natural));
  // Litt høyere enn 9:16 går fint i en story, så vi sier bare ifra når det blir tydelig for høyt
  const tooTall = natural * fit > available * 1.1;
  const px = (size: number) => size * fit;

  const toggleGroup = (category: string) => {
    if (hidden.includes(category)) {
      setHidden(hidden.filter((item) => item !== category));
    } else if (shown.length > 1) {
      setHidden([...hidden, category]);
    } else {
      haptics.warning();
      return;
    }
    haptics.select();
  };

  const changeNote = (text: string) => {
    setNote(text);
    AsyncStorage.setItem(noteKey, text).catch(() => {});
  };

  const share = async () => {
    setSharing(true);
    await sharePoster(posterRef, 'prisliste.png', 'Del prisliste');
    setSharing(false);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Del prisliste" backTo="/business/services" />

      {salon.services.length === 0 ? (
        <EmptyState
          icon="pricetags-outline"
          title="Legg til en tjeneste først"
          message="Prislisten lages av tjenestene dine, med pris og varighet."
          actionLabel="Til tjenester"
          onAction={() => router.navigate('/business/services')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.controls}>
            <PosterThemePicker value={theme.key} onChange={setThemeKey} />
            {groups.length > 1 && (
              <FieldGroup label="Med på bildet">
                <View style={styles.chips}>
                  {groups.map((group) => (
                    <Chip
                      key={group.category}
                      label={group.category}
                      selected={!hidden.includes(group.category)}
                      onPress={() => toggleGroup(group.category)}
                    />
                  ))}
                </View>
              </FieldGroup>
            )}
            <TextField
              label="Ekstra info (valgfritt)"
              placeholder="F.eks. Betaling med Vipps. Avbestill senest 24 timer før."
              value={note}
              onChangeText={changeNote}
              multiline
              maxLength={200}
            />
          </View>

          {!fontsReady ? (
            <View style={[styles.loading, { width: posterWidth, height: (posterWidth * 16) / 9 }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <Poster ref={posterRef} theme={theme} width={posterWidth} salonName={salon.name} title="Prisliste" subtitle={subtitle}>
              <View style={{ gap: px(18) }}>
                {shown.map((group) => (
                  <View
                    key={group.category}
                    style={
                      theme.card && {
                        backgroundColor: theme.card,
                        borderRadius: 12,
                        paddingHorizontal: px(14),
                        paddingTop: px(12),
                        paddingBottom: px(4),
                      }
                    }
                  >
                    <Text style={[styles.category, { color: theme.muted, fontSize: px(12), marginBottom: px(6) }]}>
                      {group.category}
                    </Text>
                    <View style={!theme.card && { borderTopWidth: 1, borderColor: theme.line }}>
                      {group.services.map((service, index) => (
                        <View
                          key={service.id}
                          style={[
                            styles.row,
                            { paddingVertical: px(10) },
                            theme.card
                              ? index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.line }
                              : { borderBottomWidth: 1, borderColor: theme.line },
                          ]}
                        >
                          <View style={styles.name}>
                            <Text style={[styles.serviceName, { color: theme.ink, fontSize: px(16), lineHeight: px(21) }]}>
                              {service.name}
                            </Text>
                            <Text style={[styles.duration, { color: theme.muted, fontSize: px(12), lineHeight: px(16) }]}>
                              {formatDuration(service.durationMin)}
                            </Text>
                          </View>
                          <Text style={[styles.price, { color: theme.ink, fontSize: px(16) }]}>{formatPrice(service.priceNok)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
                {info ? (
                  <Text style={[styles.note, { color: theme.ink, fontSize: px(13), lineHeight: px(19) }]}>{info}</Text>
                ) : null}
              </View>
            </Poster>
          )}

          <Text variant="caption" align="center" style={styles.hint}>
            {tooTall
              ? `Det er mange tjenester, så bildet blir høyere enn en story.${groups.length > 1 ? ' Ta bort noen grupper over, og lag et eget bilde for resten etterpå.' : ''}`
              : 'Prisene hentes fra tjenestene dine. Med mange tjenester blir teksten mindre, så alt passer i en story.'}
          </Text>
          <Button
            title="Del bilde"
            icon="share-outline"
            size="lg"
            loading={sharing}
            disabled={!fontsReady}
            onPress={share}
            style={[styles.shareButton, { width: posterWidth }]}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { alignItems: 'center', padding: 16, paddingBottom: 40, gap: 16 },
  controls: { width: '100%', maxWidth: 420, gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  loading: { alignItems: 'center', justifyContent: 'center' },
  category: { fontFamily: fonts.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1 },
  serviceName: { fontFamily: fonts.semibold },
  duration: { fontFamily: fonts.medium },
  price: { fontFamily: fonts.bold },
  note: { fontFamily: fonts.medium, textAlign: 'center' },
  hint: { maxWidth: 420 },
  shareButton: { maxWidth: 420 },
});
