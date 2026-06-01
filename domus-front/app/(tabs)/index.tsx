import React, { useCallback, useRef, useState } from "react";
import {
	View,
	Text,
	Pressable,
	ScrollView,
	ActivityIndicator,
	Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
	BottomSheetModal,
	BottomSheetModalProvider,
	BottomSheetView,
	BottomSheetBackdrop,
	BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import axios from "@/api/axios";
import { useAuthStore } from "@/store/auth-store";

type SheetMode = "create" | "join";

export default function SetupHouseholdScreen() {
	const router = useRouter();
	const sheetRef = useRef<BottomSheetModal>(null);
	const { user, households } = useAuthStore();

	const [mode, setMode] = useState<SheetMode>("create");
	const [value, setValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const openSheet = useCallback((nextMode: SheetMode) => {
		setMode(nextMode);
		setValue("");
		sheetRef.current?.present();
	}, []);

	const closeSheet = useCallback(() => {
		Keyboard.dismiss();
		sheetRef.current?.dismiss();
	}, []);

	const renderBackdrop = useCallback(
		(props: any) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				pressBehavior="close"
			/>
		),
		[],
	);

	const handleSubmit = async () => {
		const trimmed = value.trim();
		if (!trimmed) {
			Toast.show({
				type: "error",
				text1: mode === "create" ? "Falta el nombre" : "Falta el código",
				text2:
					mode === "create"
						? "Escribe un nombre para tu hogar."
						: "Ingresa el código de invitación.",
			});
			return;
		}

		setIsLoading(true);
		try {
			if (mode === "create") {
				await axios.post("/homes", { name: trimmed, user });
				Toast.show({ type: "success", text1: "Hogar creado" });
			} else {
				await axios.post("/homes/join", { code: trimmed, user });
				Toast.show({ type: "success", text1: "Te uniste al hogar" });
			}

			closeSheet();
			router.replace("/home");
		} catch (e: any) {
			let message = "Ocurrió un error inesperado.";

			if (mode === "join" && e.response.status === 404) {
				message = "El código no es válido o no existe.";
			} else {
				message = e.response.data?.message || message;
			}

			Toast.show({ type: "error", text1: "Error", text2: message });
		} finally {
			setIsLoading(false);
		}
	};

	const isCreate = mode === "create";
	
	if (!user) {
		return (
			<View className="flex-1 items-center justify-center bg-slate-50">
				<ActivityIndicator size="large" color="#3B82F6" />
			</View>
		);
	}

	if (households && households.length > 0) {
		router.replace("/(tabs)"); // ajusta a tu ruta principal
		return null;
	}

	return (
		<GestureHandlerRootView className="flex-1">
			<BottomSheetModalProvider>
				<ScrollView
					className="flex-1 bg-slate-50"
					contentContainerClassName="px-6 pt-16 pb-12"
					showsVerticalScrollIndicator={false}
				>
					{/* Brand */}
					<Text className="text-center text-[17px] font-nunito-bold text-blue-600 mb-8">
						Domus
					</Text>

					{/* Title + subtitle */}
					<View className="items-center mb-10">
						<Text className="text-[28px] font-nunito-extrabold text-gray-900 mb-2">
							Casi listo, {user.name}
						</Text>
						<Text className="text-md font-nunito text-gray-500 text-center leading-6">
							Para empezar, necesitamos saber si ya tienes un hogar configurado o
							si quieres empezar uno nuevo.
						</Text>
					</View>

					{/* Opción: Crear hogar */}
					<Pressable
						onPress={() => openSheet("create")}
						className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 active:bg-gray-50"
					>
						<View className="w-12 h-12 rounded-xl bg-blue-600 items-center justify-center mb-4">
							<Ionicons name="home" size={22} color="#fff" />
						</View>
						<Text className="text-lg font-nunito-bold text-gray-900 mb-1">
							Crear hogar
						</Text>
						<Text className="text-sm font-nunito text-gray-500 leading-5">
							Empieza un nuevo espacio desde cero y conviértete en el
							administrador.
						</Text>
					</Pressable>

					{/* Opción: Unirme a un hogar */}
					<Pressable
						onPress={() => openSheet("join")}
						className="bg-white border border-gray-200 rounded-2xl p-5 active:bg-gray-50"
					>
						<View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center mb-4">
							<Ionicons name="people" size={22} color="#374151" />
						</View>
						<Text className="text-lg font-nunito-bold text-gray-900 mb-1">
							Unirme a un hogar
						</Text>
						<Text className="text-sm font-nunito text-gray-500 leading-5">
							Ingresa con un código de invitación enviado por un miembro de tu
							familia.
						</Text>
					</Pressable>
				</ScrollView>

				<BottomSheetModal
					ref={sheetRef}
					enableDynamicSizing
					backdropComponent={renderBackdrop}
					keyboardBehavior="interactive"
					android_keyboardInputMode="adjustResize"
					handleIndicatorStyle={{ backgroundColor: "#D1D5DB" }}
				>
					<BottomSheetView className="px-6 pt-2 pb-10">
						<Text className="text-xl font-nunito-extrabold text-gray-900 mb-1">
							{isCreate ? "Crear hogar" : "Unirme a un hogar"}
						</Text>
						<Text className="text-sm font-nunito text-gray-500 mb-5">
							{isCreate
								? "Elige un nombre para identificar tu hogar."
								: "Ingresa el código que te compartieron."}
						</Text>

						<Text className="text-sm font-nunito-semibold text-gray-700 mb-2">
							{isCreate ? "Nombre del hogar" : "Código de invitación"}
						</Text>
						<BottomSheetTextInput
							value={value}
							onChangeText={setValue}
							placeholder={isCreate ? "Ej. Casa de los Pérez" : "Ej. A1B2C3"}
							placeholderTextColor="#9CA3AF"
							autoCapitalize={isCreate ? "words" : "characters"}
							autoCorrect={false}
							autoFocus
							className="border border-gray-200 rounded-xl px-4 h-14 text-base font-nunito text-gray-900 bg-gray-50"
						/>

						<Pressable
							onPress={handleSubmit}
							disabled={isLoading}
							className={`bg-blue-600 rounded-2xl h-14 items-center justify-center mt-6 ${isLoading ? "opacity-70" : ""
								}`}
						>
							{isLoading ? (
								<ActivityIndicator color="#fff" />
							) : (
								<Text className="text-white text-base font-nunito-bold tracking-wide">
									{isCreate ? "Crear hogar" : "Unirme"}
								</Text>
							)}
						</Pressable>
					</BottomSheetView>
				</BottomSheetModal>
			</BottomSheetModalProvider>
		</GestureHandlerRootView>
	);
}