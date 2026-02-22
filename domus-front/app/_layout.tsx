import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/store/auth-store";
import Toast from 'react-native-toast-message';

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
			<Stack>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="(auth)" options={{ headerShown: false }} />
				<Stack.Screen
					name="modal"
					options={{ presentation: "modal", title: "Modal" }}
				/>
			</Stack>
			<StatusBar style="auto" />
			<Toast />
		</>
		// </ThemeProvider>
	);
}

export default function RootLayout() {
	return <RootLayoutNav />;
}
