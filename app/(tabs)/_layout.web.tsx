import { StyleSheet, View } from 'react-native';
import { Slot, usePathname } from 'expo-router';
import { WebHeader } from '@/components/web-header';
import { colors } from '@/constants/theme';

// Nettsiden har toppmeny i stedet for bunnmenyen i appen; sidene og adressene er de samme
export default function WebTabLayout() {
  const pathname = usePathname();

  return (
    <View style={styles.screen}>
      <WebHeader />
      {/* Forsiden styrer bredden selv, de andre sidene er lister som blir uleselige på full bredde */}
      <View style={[styles.content, pathname !== '/explore' && styles.column]}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, width: '100%' },
  column: { maxWidth: 760, alignSelf: 'center' },
});
