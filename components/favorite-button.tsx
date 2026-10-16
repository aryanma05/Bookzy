import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { PressableScale } from '@/components/ui/pressable-scale';
import { colors, shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';

const HEART = '#E5484D';

export function FavoriteButton({ salonId, size = 36, floating = true }: { salonId: string; size?: number; floating?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(salonId);
  const scale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const onPress = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    haptics.tap();
    scale.set(withSequence(withSpring(1.25, { damping: 18, stiffness: 400 }), withSpring(1)));
    toggleFavorite(salonId).catch(() => showAlert('Noe gikk galt', 'Kunne ikke oppdatere favorittene dine.'));
  };

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Fjern fra favoritter' : 'Legg til i favoritter'}
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        floating && styles.floating,
      ]}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={active ? 'heart' : 'heart-outline'} size={size * 0.55} color={active ? HEART : colors.ink} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  floating: { backgroundColor: 'rgba(255, 255, 255, 0.95)', ...shadows.card },
});
