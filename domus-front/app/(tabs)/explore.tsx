import { useAuthStore } from '@/store/auth-store';
import { router } from 'expo-router';
import { View, Text, Button } from 'react-native';
export default function TabTwoScreen() {
  const { logout } = useAuthStore()
  const handleLogout = async () => {
    await logout();
  }
  return (
    <View className="flex-1 items-center justify-center bg-black">
      <Text className="text-white text-xl bg-blue-500">Funciona</Text>
      <Button title="Ir a login" onPress={() => router.push('/(auth)/login')} />
      <Button title="Ir a register" onPress={() => router.push('/(auth)/register')} />
      <Button title="Cerrar sesión" onPress={handleLogout} />
    </View>
  );
}