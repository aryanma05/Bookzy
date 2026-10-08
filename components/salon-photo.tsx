import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { CATEGORIES, type Salon } from '@/lib/salons';

type SalonPhotoProps = {
  salon: Pick<Salon, 'imageUrl' | 'category'>;
  style: StyleProp<ImageStyle>;
  iconSize?: number;
};

/** Hovedbildet til salongen, eller kategoriikonet for nye bedrifter som ikke har lagt inn bilder ennå. */
export function SalonPhoto({ salon, style, iconSize = 28 }: SalonPhotoProps) {
  if (salon.imageUrl) {
    return <Image source={{ uri: salon.imageUrl }} style={style} contentFit="cover" transition={250} />;
  }
  const icon = CATEGORIES.find((category) => category.name === salon.category)?.icon ?? 'storefront-outline';
  return (
    <View style={[style as StyleProp<ViewStyle>, styles.placeholder]}>
      <Ionicons name={icon} size={iconSize} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
