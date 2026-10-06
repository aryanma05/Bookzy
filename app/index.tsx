import { Text, StyleSheet, Pressable, View, StatusBar, Animated } from 'react-native';
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '@/context/OnboardingContext';

// Onboarding data – 3 skjermer
const onboardingSlides = [
  {
    title: 'Velkommen til Timeflyt',
    description: 'Oppdag de beste frisørene, massasjesalongene og skjønnhetspleiene i ditt område.',
    icon: 'sparkles-outline',
    gradient: ['#667eea', '#764ba2'],
  },
  {
    title: 'Book på sekunder',
    description: 'Velg tidspunkt som passer deg og bestill direkte i appen. Ingen venting på telefon.',
    icon: 'calendar-outline',
    gradient: ['#f093fb', '#f5576c'],
  },
  {
    title: 'Din tid, din måte',
    description: 'Se alle timene dine på ett sted, og avbestill enkelt om planene endrer seg.',
    icon: 'time-outline',
    gradient: ['#4facfe', '#00f2fe'],
  },
];

function animateIn(fadeAnim: Animated.Value, slideAnim: Animated.Value) {
  slideAnim.setValue(50);
  Animated.parallel([
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    Animated.spring(slideAnim, { toValue: 0, damping: 15, useNativeDriver: true }),
  ]).start();
}

export default function IndexScreen() {
  const { hasSeenOnboarding, completeOnboarding } = useOnboarding();

  // Onboarding vises bare første gang appen åpnes
  if (hasSeenOnboarding) {
    return <Redirect href="/explore" />;
  }

  return <Onboarding onDone={completeOnboarding} />;
}

function Onboarding({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Animasjonsverdier (useState i stedet for useRef, så de ikke leses fra en ref under render)
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(50));

  useEffect(() => {
    animateIn(fadeAnim, slideAnim);
  }, [fadeAnim, slideAnim]);

  const handleNext = () => {
    if (currentSlide < onboardingSlides.length - 1) {
      // Først animasjon ut, så bytt slide og animer inn igjen
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setCurrentSlide(currentSlide + 1);
        animateIn(fadeAnim, slideAnim);
      });
    } else {
      onDone();
    }
  };

  const currentSlideData = onboardingSlides[currentSlide];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Bakgrunnsgradient */}
      <View
        style={[
          styles.gradientBackground,
          { backgroundColor: currentSlideData.gradient[0] },
        ]}
      >
        <View
          style={[
            styles.gradientOverlay,
            { backgroundColor: currentSlideData.gradient[1] },
          ]}
        />
      </View>

      {/* Skip-knapp */}
      {currentSlide < onboardingSlides.length - 1 && (
        <Pressable onPress={onDone} style={[styles.skipButton, { top: insets.top + 12 }]}>
          <Text style={styles.skipText}>Hopp over</Text>
        </Pressable>
      )}

      {/* Hovedinnhold */}
      <View
        style={[
          styles.contentContainer,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* Ikon/illustrasjon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Ionicons name={currentSlideData.icon as any} size={120} color="white" />
        </Animated.View>

        {/* Tittel og beskrivelse */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>{currentSlideData.title}</Text>
          <Text style={styles.description}>{currentSlideData.description}</Text>
        </Animated.View>

        {/* Sideindikatorer (dots) */}
        {currentSlide < onboardingSlides.length - 1 && (
          <View style={styles.pagination}>
            {onboardingSlides.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === currentSlide && styles.activeDot]}
              />
            ))}
          </View>
        )}

        {/* Knapp */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Pressable style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>
              {currentSlide === onboardingSlides.length - 1 ? 'Kom i gang' : 'Neste'}
            </Text>
            <Ionicons
              name={currentSlide === onboardingSlides.length - 1 ? 'checkmark' : 'arrow-forward'}
              size={20}
              color="white"
              style={styles.buttonIcon}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    flex: 1,
    opacity: 0.7,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    zIndex: 10,
  },
  skipText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.8,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activeDot: {
    width: 24,
    backgroundColor: 'white',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 8,
  },
});