import { useState, type ReactNode, type Ref, type RefObject } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { GreatVibes_400Regular } from '@expo-google-fonts/great-vibes/400Regular';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { LogoMark } from '@/components/logo';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { colors, fonts, radius, shadows } from '@/constants/theme';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';

export type PosterTheme = {
  key: string;
  label: string;
  /** Ovenfra og ned; to like farger gir ensfarget bakgrunn */
  background: [string, string];
  ink: string;
  muted: string;
  line: string;
  /** Med kortfarge vises innholdet som egne kort i stedet for med streker */
  card?: string;
  headingFont: string;
  headingSize: number;
  lowercase?: boolean;
  dark?: boolean;
};

const SCRIPT = 'GreatVibes_400Regular';
const SERIF = 'PlayfairDisplay_700Bold';

export const POSTER_THEMES: PosterTheme[] = [
  {
    key: 'simple',
    label: 'Enkel',
    background: ['#FFFFFF', '#FFFFFF'],
    ink: colors.ink,
    muted: colors.textMuted,
    line: colors.ink,
    headingFont: fonts.extrabold,
    headingSize: 46,
    lowercase: true,
  },
  {
    key: 'rose',
    label: 'Rosa',
    background: ['#FDF2F4', '#F7D9E0'],
    ink: '#7A2E46',
    muted: '#C08A9B',
    line: '#E8B9C6',
    card: 'rgba(255, 255, 255, 0.78)',
    headingFont: SCRIPT,
    headingSize: 70,
  },
  {
    key: 'night',
    label: 'Natt',
    background: ['#26221F', '#0E0D0C'],
    ink: '#E8D2A2',
    muted: '#857A66',
    line: 'rgba(232, 210, 162, 0.4)',
    headingFont: SCRIPT,
    headingSize: 70,
    dark: true,
  },
  {
    key: 'pastel',
    label: 'Pastell',
    background: ['#E6E1FF', '#FFE3D6'],
    ink: '#3B3363',
    muted: '#9A90C0',
    line: '#C9C1EC',
    card: 'rgba(255, 255, 255, 0.62)',
    headingFont: fonts.extrabold,
    headingSize: 46,
    lowercase: true,
  },
  {
    key: 'beige',
    label: 'Beige',
    background: ['#F5EEE5', '#EBDFD0'],
    ink: '#5A4434',
    muted: '#AE9886',
    line: '#D9C9B6',
    card: '#FBF7F2',
    headingFont: SERIF,
    headingSize: 50,
  },
];

const headingLineHeight = (theme: PosterTheme) => theme.headingSize * (theme.headingFont === SCRIPT ? 1.3 : 1.17);

/** Omtrent hvor høyt innholdet kan bli før bildet blir høyere enn 9:16. */
export function posterContentHeight(theme: PosterTheme, width: number): number {
  // Luft over og under (36 + 28), mellomrommet under overskriften (22), salongnavnet (19) og undertittelen (20)
  return (width * 16) / 9 - 64 - 22 - 39 - headingLineHeight(theme);
}

/** True når skriftene til stilene er klare (eller ikke kunne lastes, da brukes standardskriften). */
export function usePosterFonts(): boolean {
  const [loaded, error] = useFonts({ [SCRIPT]: GreatVibes_400Regular, [SERIF]: PlayfairDisplay_700Bold });
  return loaded || !!error;
}

/**
 * Deler bildet på nettet med delingsmenyen der den finnes, ellers lastes det ned.
 * Gir false når nettleseren vil ha et nytt trykk fordi bildet tok for lang tid å lage (vanlig på mobil).
 */
async function shareOnWeb(file: File, mayAskAgain: boolean) {
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return true;
    }
  } catch (error) {
    const name = (error as Error).name;
    if (name === 'AbortError') return true;
    if (name === 'NotAllowedError' && mayAskAgain) return false;
    // Nettleseren nektet å dele av en annen grunn, så vi laster det ned i stedet
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  return true;
}

/**
 * Lager et bilde av plakaten og deler det. På mobil deles det som fil med delingsmenyen.
 * På nettet brukes delingsmenyen der den finnes, ellers lastes bildet ned.
 * `inputs` er alt plakaten lages av: et bilde som venter på et nytt trykk, lages på nytt hvis noe av det endres.
 */
export function usePosterShare(ref: RefObject<View | null>, fileName: string, dialogTitle: string, inputs: unknown[]) {
  const [sharing, setSharing] = useState(false);
  // Bildet som er laget på nettet, men som nettleseren ville ha et nytt trykk for å dele
  const [prepared, setPrepared] = useState<{ file: File; madeFor: unknown[] } | null>(null);
  const readyFile = prepared?.madeFor.every((value, index) => value === inputs[index]) ? prepared.file : null;

  const share = async () => {
    // Ingen venting før delingsmenyen her, ellers nekter nettleseren igjen
    if (readyFile) {
      setPrepared(null);
      await shareOnWeb(readyFile, false);
      return;
    }
    setSharing(true);
    try {
      if (Platform.OS !== 'web') {
        const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
        return;
      }
      // html2canvas kopierer hele siden og venter uten tidsgrense på hvert bilde i kopien. Lazy-bilder
      // (standard i expo-image) lastes aldri der i Safari, så da lastet knappen for evig.
      document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
      const uri = await Promise.race([
        captureRef(ref, { format: 'png', quality: 1, result: 'data-uri' }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Brukte for lang tid på å lage bildet')), 20_000)),
      ]);
      const file = new File([await (await fetch(uri)).blob()], fileName, { type: 'image/png' });
      if (!(await shareOnWeb(file, true))) setPrepared({ file, madeFor: inputs });
    } catch (error) {
      console.error('Kunne ikke dele bildet:', error);
      showAlert('Kunne ikke lage bildet', 'Prøv igjen om litt.');
    } finally {
      setSharing(false);
    }
  };

  return { share, sharing, ready: !!readyFile };
}

export function PosterThemePicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themes}>
      {POSTER_THEMES.map((item) => {
        const selected = item.key === value;
        return (
          <PressableScale
            key={item.key}
            scaleTo={0.94}
            onPress={() => {
              haptics.select();
              onChange(item.key);
            }}
            style={styles.themeOption}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Stil: ${item.label}`}
          >
            <LinearGradient colors={item.background} style={[styles.themeSwatch, selected && styles.themeSwatchSelected]}>
              <Text style={{ fontFamily: item.headingFont, fontSize: item.headingFont === SCRIPT ? 26 : 19, color: item.ink }}>
                Aa
              </Text>
            </LinearGradient>
            <Text variant="caption" color={selected ? colors.ink : colors.textSecondary}>{item.label}</Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

type PosterProps = {
  ref: Ref<View>;
  theme: PosterTheme;
  width: number;
  salonName: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** Bildet som deles: minst 9:16, så det passer i en Instagram-story, med salongnavn, overskrift og Bookzy-merket. */
export function Poster({ ref, theme, width, salonName, title, subtitle, children }: PosterProps) {
  return (
    <View ref={ref} collapsable={false} style={[styles.poster, { width, minHeight: (width * 16) / 9 }]}>
      <LinearGradient colors={theme.background} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <Text style={[styles.salon, { color: theme.muted }]} numberOfLines={1}>{salonName}</Text>
        <Text
          style={{
            fontFamily: theme.headingFont,
            fontSize: theme.headingSize,
            lineHeight: headingLineHeight(theme),
            letterSpacing: theme.headingFont === SCRIPT ? 0 : -theme.headingSize * 0.03,
            color: theme.ink,
          }}
        >
          {theme.lowercase ? title.toLowerCase() : title}
        </Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
      </View>

      {children}

      <View style={styles.watermark}>
        <LogoMark height={9} white={theme.dark} />
        <Text style={[styles.watermarkText, { color: theme.ink }]}>Bookzy</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  themes: { gap: 12, paddingVertical: 2 },
  themeOption: { alignItems: 'center', gap: 4 },
  themeSwatch: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeSwatchSelected: { borderWidth: 2.5, borderColor: colors.primary },
  // Uten avrundede hjørner, så det delte bildet ikke får gjennomsiktige kanter
  poster: {
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 28,
    justifyContent: 'center',
    gap: 22,
    ...shadows.card,
  },
  header: { alignItems: 'center' },
  salon: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 4 },
  subtitle: { fontFamily: fonts.medium, fontSize: 15 },
  watermark: { position: 'absolute', right: 14, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.4 },
  watermarkText: { fontFamily: fonts.semibold, fontSize: 10 },
});
