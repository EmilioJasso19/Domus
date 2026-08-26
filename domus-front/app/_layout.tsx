import "react-native-reanimated";
import "../global.css";

import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold,useFonts } from "@expo-google-fonts/nunito";
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from 'react-native-toast-message';

import { useAuthStore } from "@/store/auth-store";
import { useHomeStore } from "@/store/home-store";
import { registerForPushNotificationsAsync } from "@/utils/push-notifications";

SplashScreen.preventAutoHideAsync();


export const unstable_settings = {
	anchor: "(tabs)",
};

function RootLayoutNav() {
	// const colorScheme = useColorScheme();
	const { token, loadToken, isHydrated } = useAuthStore();
	const segments = useSegments();
	const router = useRouter()
	const navigationState = useRootNavigationState();

	useEffect(() => {
		loadToken();
	}, []);

	// Con sesión iniciada, registramos el token de push del dispositivo. Si el
	// usuario deniega permisos, el helper omite el registro sin bloquear.
	useEffect(() => {
		if (!token) return;

		// Al arrancar con sesión (y al iniciar sesión).
		registerForPushNotificationsAsync();

		// Latido: cada vuelta a primer plano refresca last_seen_at en el backend,
		// que es la señal con la que distingue dispositivos vivos de abandonados.
		// El helper aplica su propio guard temporal (6 h), así que alternar de app
		// no dispara una petición por cada cambio.
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") registerForPushNotificationsAsync();
		});

		return () => subscription.remove();
	}, [token]);

	useEffect(() => {
		if (!navigationState?.key || !isHydrated) return;

		const inAuthGroup = segments[0] === "(auth)";
		const { households } = useHomeStore.getState();

		if (!token && !inAuthGroup) {
			router.replace("/(auth)/login");
		} else if (token && inAuthGroup) {
			// Has homes → go to dashboard; no homes → go to setup
			router.replace(households.length > 0 ? "/home" : "/(tabs)");
		} else if (token && !inAuthGroup && segments[1] === "index") {
			// Landed on setup tab but has homes → redirect to dashboard
			if (households.length > 0) {
				router.replace("/home");
			}
		}
	}, [navigationState?.key, token, segments, isHydrated, router]);

	return (
		// <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
		<KeyboardProvider>
			<GestureHandlerRootView className="flex-1">
				<SafeAreaView className="flex-1">
					<Stack screenOptions={{ headerShown: false }}>
						<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
						<Stack.Screen name="(auth)" options={{ headerShown: false }} />
					</Stack>
					<StatusBar style="auto" />
					<Toast />
				</SafeAreaView>
			</GestureHandlerRootView>
		</KeyboardProvider>
		// </ThemeProvider>
	);
}

export default function RootLayout() {
	const [loaded] = useFonts({
		Nunito_400Regular,
		Nunito_600SemiBold,
		Nunito_700Bold,
		Nunito_800ExtraBold,
	});

	useEffect(() => {
		if (loaded) SplashScreen.hideAsync();
	}, [loaded]);

	if (!loaded) return null;
	return <RootLayoutNav />;
}
