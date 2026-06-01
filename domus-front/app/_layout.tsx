
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";
import { useAuthStore } from "@/store/auth-store";
import Toast from 'react-native-toast-message';
import { useFonts, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import * as SplashScreen from "expo-splash-screen";

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

	useEffect(() => {
		if (!navigationState?.key || !isHydrated) return; 

		const inAuthGroup = segments[0] === "(auth)";

		if (!token && !inAuthGroup) {
			router.replace("/(auth)/login");
		} else if (token && inAuthGroup) {
			router.replace("/(tabs)");
		}
	}, [navigationState?.key, token, segments, isHydrated]);

	return (
		// <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
		<>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="(auth)" options={{ headerShown: false }} />
			</Stack>
			<StatusBar style="auto" />
			<Toast />
		</>
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
