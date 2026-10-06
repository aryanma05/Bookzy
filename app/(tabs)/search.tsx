import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SalonRow } from '@/components/salon-card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, radius } from '@/constants/theme';
import { useLocation } from '@/context/LocationContext';
import { useSalons } from '@/context/SalonsContext';
import { distanceKm } from '@/lib/geo';
import { CATEGORIES, lowestPrice, type Salon } from '@/lib/salons';

type Sort = 'recommended' | 'rating' | 'price' | 'distance';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'recommended', label: 'Anbefalt' },
  { value: 'rating', label: 'Best vurdert' },
  { value: 'price', label: 'Lavest pris' },
  { value: 'distance', label: 'Nærmest' },
];

const isSort = (value: unknown): value is Sort => SORTS.some((sort) => sort.value === value);

function matches(salon: Salon, search: string) {
  const fields = [salon.name, salon.category, salon.address, salon.area, ...salon.services.map((service) => service.name)];
  return fields.some((field) => field.toLowerCase().includes(search));
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string; sort?: string; focus?: string }>();
  const { salons, loading, error, retry } = useSalons();
  const { coords, requestLocation } = useLocation();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [sort, setSort] = useState<Sort>(isSort(params.sort) ? params.sort : 'recommended');

  // Når forsiden sender oss hit med en kategori eller sortering, skal den gjelde – også om fanen alt er åpen
  const [lastParams, setLastParams] = useState({ category: params.category, sort: params.sort });
  if (params.category !== lastParams.category || params.sort !== lastParams.sort) {
    setLastParams({ category: params.category, sort: params.sort });
    if (params.category !== lastParams.category) setCategory(params.category ?? null);
    if (params.sort !== lastParams.sort && isSort(params.sort)) setSort(params.sort);
  }

  const search = query.trim().toLowerCase();
  const results = salons
    .filter((salon) => (!category || salon.category === category) && (!search || matches(salon, search)))
    .sort((a, b) => {
      switch (sort) {
        case 'rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
        case 'price':
          return (lowestPrice(a) ?? Infinity) - (lowestPrice(b) ?? Infinity);
        case 'distance':
          return coords && a.location && b.location
            ? distanceKm(coords, a.location) - distanceKm(coords, b.location)
            : 0;
        default:
          // Vekter snittet med hvor mange som har vurdert, så én femmer ikke slår 150 gode anmeldelser
          return (b.rating ?? 0) * Math.log10(b.reviewCount + 10) - (a.rating ?? 0) * Math.log10(a.reviewCount + 10);
      }
    });

  const chooseSort = (value: Sort) => {
    setSort(value);
    if (value === 'distance' && !coords) requestLocation();
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text variant="title">Søk</Text>
        <TextField
          key={params.focus}
          icon="search"
          placeholder="Salong, behandling eller område"
          value={query}
          onChangeText={setQuery}
          autoFocus={!!params.focus}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((item) => (
            <Chip
              key={item.name}
              label={item.name}
              icon={item.icon}
              selected={category === item.name}
              onPress={() => setCategory(category === item.name ? null : item.name)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.sortRow}>
        <Text variant="caption" style={styles.count}>{loading ? 'Laster…' : `${results.length} ${results.length === 1 ? 'salong' : 'salonger'}`}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sorts}>
          {SORTS.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={sort === item.value}
              onPress={() => chooseSort(item.value)}
              style={styles.sortChip}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} height={116} borderRadius={radius.lg} />
          ))}
        </View>
      ) : error && salons.length === 0 ? (
        <EmptyState icon="cloud-offline-outline" title="Kunne ikke laste salonger" actionLabel="Prøv igjen" onAction={retry} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(salon) => salon.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <Animated.View entering={FadeIn.duration(250)}>
              <SalonRow salon={item} />
            </Animated.View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="Ingen treff"
              message={search ? `Vi fant ingen salonger for «${query.trim()}». Prøv et annet ord eller fjern filteret.` : 'Prøv en annen kategori.'}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  chips: { gap: 8, paddingRight: 20 },
  sortRow: { paddingTop: 14, paddingBottom: 4, gap: 10 },
  sorts: { gap: 8, paddingHorizontal: 20 },
  sortChip: { height: 32 },
  count: { paddingHorizontal: 20 },
  list: { padding: 20, gap: 12 },
});
