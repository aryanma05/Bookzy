import { Text, StyleSheet, Pressable, ImageBackground, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

// Forhindrer at splash skjules med en gang
SplashScreen.preventAutoHideAsync();

export default function LoginScreen() {
  const [appIsReady, setAppIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <ImageBackground 
      // Siden du valgte Alternativ 2 og har bildet inni app-mappen:
      source={require('./assets/images/background.jpg')} 
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Text style={styles.title}>Timeflyt</Text>
        
        <View style={styles.buttonContainer}>
          <Pressable style={styles.buttonApple} onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.buttonText}>Fortsett med Apple</Text>
          </Pressable>

          <Pressable style={styles.buttonGoogle} onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.buttonTextDark}>Fortsett med Google</Text>
          </Pressable>

          <Pressable style={styles.buttonLogin} onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.buttonText}>Logg inn</Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}

// HER er styles-objektet som manglet eller ikke ble funnet!
const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // Gjør bildet litt mørkere
    justifyContent: 'space-between',
    padding: 30,
    paddingTop: 100,
    paddingBottom: 50,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 15, 
  },
  buttonApple: {
    backgroundColor: 'black',
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonGoogle: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonLogin: {
    backgroundColor: '#007AFF', 
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDark: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  }
});