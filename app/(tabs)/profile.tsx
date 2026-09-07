import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      {/* Toppseksjon med profilbilde */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Ionicons name="person" size={50} color="gray" />
        </View>
        <Text style={styles.name}>Aryan Ali</Text>
        <Text style={styles.email}>aryan.ali@student.uio.no</Text>
      </View>

      {/* Menyliste */}
      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Konto</Text>
        
        <Pressable style={styles.menuItem}>
          <Ionicons name="person-circle-outline" size={24} color="black" />
          <Text style={styles.menuText}>Personlige opplysninger</Text>
          <Ionicons name="chevron-forward" size={20} color="gray" style={styles.arrow} />
        </Pressable>

        <Pressable style={styles.menuItem}>
          <Ionicons name="card-outline" size={24} color="black" />
          <Text style={styles.menuText}>Betalingsmetoder</Text>
          <Ionicons name="chevron-forward" size={20} color="gray" style={styles.arrow} />
        </Pressable>
      </View>

      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Bedrift</Text>
        
        <Pressable style={styles.menuItem}>
          <Ionicons name="business-outline" size={24} color="black" />
          <Text style={styles.menuText}>Registrer din bedrift</Text>
          <Ionicons name="chevron-forward" size={20} color="gray" style={styles.arrow} />
        </Pressable>
      </View>

      {/* Logg ut-knapp */}
      <Pressable 
        style={styles.logoutButton} 
        onPress={() => router.replace('/')} // Sender deg tilbake til bakgrunnsbildet / index.tsx
      >
        <Text style={styles.logoutText}>Logg ut</Text>
      </Pressable>
    </ScrollView>
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