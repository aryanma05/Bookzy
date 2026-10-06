import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { showAlert } from '@/lib/alert';

const comingSoon = () => showAlert('Kommer snart', 'Denne delen av appen er ikke ferdig ennå.');

export default function ProfileScreen() {
  const router = useRouter();
  const { user, displayName, signOut } = useAuth();

  const handleSignOut = () => {
    signOut().catch((error) => {
      console.error('Kunne ikke logge ut:', error);
      showAlert('Noe gikk galt', 'Kunne ikke logge ut. Prøv igjen.');
    });
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <Ionicons name="person" size={50} color="gray" />
          </View>
          <Text style={styles.name}>Ikke logget inn</Text>
          <Text style={styles.email}>Logg inn for å bestille og se timene dine.</Text>
          <Pressable style={styles.loginButton} onPress={() => router.push('/login')}>
            <Text style={styles.loginText}>Logg inn eller opprett konto</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Toppseksjon med profilbilde */}
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <Ionicons name="person" size={50} color="gray" />
          </View>
          <Text style={styles.name}>{displayName || 'Uten navn'}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>

        {/* Menyliste */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Konto</Text>
        
          <Pressable style={styles.menuItem} onPress={comingSoon}>
            <Ionicons name="person-circle-outline" size={24} color="black" />
            <Text style={styles.menuText}>Personlige opplysninger</Text>
            <Ionicons name="chevron-forward" size={20} color="gray" style={styles.arrow} />
          </Pressable>

          <Pressable style={styles.menuItem} onPress={comingSoon}>
            <Ionicons name="card-outline" size={24} color="black" />
            <Text style={styles.menuText}>Betalingsmetoder</Text>
            <Ionicons name="chevron-forward" size={20} color="gray" style={styles.arrow} />
          </Pressable>
        </View>

        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Bedrift</Text>
        
          <Pressable style={styles.menuItem} onPress={comingSoon}>
            <Ionicons name="business-outline" size={24} color="black" />
            <Text style={styles.menuText}>Registrer din bedrift</Text>
            <Ionicons name="chevron-forward" size={20} color="gray" style={styles.arrow} />
          </Pressable>
        </View>

        {/* Logg ut-knapp */}
        <Pressable style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutText}>Logg ut</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#e0e0e0',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    color: 'gray',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loginButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  loginText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  menuContainer: {
    backgroundColor: 'white',
    marginTop: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 14,
    color: 'gray',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginLeft: 20,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
    flex: 1,
  },
  arrow: {
    marginLeft: 'auto',
  },
  logoutButton: {
    margin: 20,
    marginTop: 40,
    backgroundColor: '#FF3B30', // Rød farge for å logge ut
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});