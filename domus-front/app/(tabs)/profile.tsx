import React, { useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
	Settings,
	ChevronDown,
	ChevronRight,
	SlidersHorizontal,
	CalendarCheck,
	LogOut,
	Home as HomeIcon,
	Check,
} from "lucide-react-native";
import {
	BottomSheetModal,
	BottomSheetModalProvider,
	BottomSheetView,
	BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "@/store/auth-store";
import { useHomeStore } from "@/store/home-store";
import { Household } from "@/constants/types";
import { ERROR, BACKGROUND, BLUE } from "@/constants/colors";

const cardShadow = {
	shadowColor: "#111827",
	shadowOffset: { width: 0, height: 4 },
	shadowOpacity: 0.04,
	shadowRadius: 12,
	elevation: 1,
};

type NavItem = {
	key: string;
	title: string;
	subtitle: string;
	icon: React.ReactNode;
	route: "/task-preferences" | "/availability";
};

export default function ProfileScreen() {
	const router = useRouter();
	const { user, logout } = useAuthStore();
	const { households, householdIdSelected, selectHome } = useHomeStore();
	const sheetRef = useRef<BottomSheetModal>(null);

	const activeHome = households.find((h) => h.id === householdIdSelected);

	const fullName = [user?.name, user?.paternal_surname]
		.filter(Boolean)
		.join(" ");

	const initials = `${user?.name?.[0] ?? ""}${
		user?.paternal_surname?.[0] ?? ""
	}`.toUpperCase();

	const openHomeSelector = useCallback(() => sheetRef.current?.present(), []);

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

	const handleSelectHome = (home: Household) => {
		selectHome(home);
		sheetRef.current?.dismiss();
	};

	const navItems: NavItem[] = [
		{
			key: "preferences",
			title: "Preferencias de tareas",
			subtitle: "Ayuda a mejorar la asignación automática",
			icon: <SlidersHorizontal size={22} color="#374151" />,
			route: "/task-preferences",
		},
		{
			key: "availability",
			title: "Disponibilidad",
			subtitle: "Define cuándo puedes colaborar en casa",
			icon: <CalendarCheck size={22} color="#374151" />,
			route: "/availability",
		},
	];

	return (
		<GestureHandlerRootView className="flex-1">
			<BottomSheetModalProvider>
				<View className="flex-1" style={{ backgroundColor: BACKGROUND }}>
					<ScrollView
						className="flex-1"
						contentContainerClassName="px-5 pb-32 pt-6"
						showsVerticalScrollIndicator={false}
					>
						{/* ── Avatar + identidad ── */}
						<View className="items-center">
							<View
								className="h-24 w-24 items-center justify-center rounded-full"
								style={{ backgroundColor: BLUE }}
							>
								<Text className="text-3xl font-nunito-extrabold text-white">
									{initials || "?"}
								</Text>
							</View>

							<Text className="mt-4 text-2xl font-nunito-bold text-gray-900">
								{fullName || "Tu nombre"}
							</Text>
							<Text className="mt-1 text-base font-nunito text-gray-500">
								{user?.email ?? ""}
							</Text>

							{/* ── Selector de hogar ── */}
							<Pressable
								onPress={openHomeSelector}
								accessibilityRole="button"
								accessibilityLabel="Cambiar de hogar"
								className="mt-5 flex-row items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5"
								style={cardShadow}
							>
								<HomeIcon size={16} color="#374151" />
								<Text className="text-base font-nunito-semibold text-gray-800">
									{activeHome?.name ?? "Selecciona un hogar"}
								</Text>
								<ChevronDown size={16} color="#6B7280" />
							</Pressable>
						</View>

						{/* ── Tarjetas de navegación ── */}
						<View
							className="mt-8 overflow-hidden rounded-3xl bg-white"
							style={cardShadow}
						>
							{navItems.map((item, index) => (
								<Pressable
									key={item.key}
									onPress={() => router.push(item.route)}
									accessibilityRole="button"
									accessibilityLabel={item.title}
									className={`min-h-[76px] flex-row items-center gap-4 px-5 py-4 active:bg-gray-50 ${
										index > 0 ? "border-t border-gray-100" : ""
									}`}
								>
									<View className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
										{item.icon}
									</View>
									<View className="min-w-0 flex-1">
										<Text className="text-base font-nunito-bold text-gray-900">
											{item.title}
										</Text>
										<Text
											className="mt-0.5 text-sm font-nunito text-gray-500"
											numberOfLines={2}
										>
											{item.subtitle}
										</Text>
									</View>
									<ChevronRight size={20} color="#9CA3AF" />
								</Pressable>
							))}
						</View>

						{/* ── Cerrar sesión ── */}
						<Pressable
							onPress={() => logout()}
							accessibilityRole="button"
							accessibilityLabel="Cerrar sesión"
							className="mt-10 min-h-[48px] flex-row items-center justify-center gap-2 rounded-2xl active:bg-red-50"
						>
							<LogOut size={20} color={ERROR} />
							<Text
								className="text-base font-nunito-bold"
								style={{ color: ERROR }}
							>
								Cerrar sesión
							</Text>
						</Pressable>
					</ScrollView>
				</View>

				{/* ── Bottom Sheet: selector de hogar ── */}
				<BottomSheetModal
					ref={sheetRef}
					enableDynamicSizing
					backdropComponent={renderBackdrop}
					handleIndicatorStyle={{ backgroundColor: "#D1D5DB" }}
				>
					<BottomSheetView className="px-5 pb-10 pt-2">
						<Text className="mb-4 text-lg font-nunito-extrabold text-gray-900">
							Tus hogares
						</Text>

						<View className="gap-2">
							{households.length === 0 ? (
								<Text className="text-base font-nunito text-gray-500">
									Aún no perteneces a ningún hogar.
								</Text>
							) : (
								households.map((home) => {
									const isSelected = home.id === householdIdSelected;
									return (
										<Pressable
											key={home.id}
											onPress={() => handleSelectHome(home)}
											accessibilityRole="button"
											accessibilityLabel={`Seleccionar ${home.name}`}
											className={`flex-row items-center gap-3 rounded-xl border px-4 py-3 ${
												isSelected
													? "border-blue-600 bg-blue-50"
													: "border-gray-200 bg-white"
											}`}
										>
											<View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
												<HomeIcon size={18} color={BLUE} />
											</View>
											<Text
												className={`flex-1 text-base ${
													isSelected
														? "font-nunito-bold text-blue-700"
														: "font-nunito-semibold text-gray-800"
												}`}
											>
												{home.name}
											</Text>
											{isSelected && <Check size={18} color={BLUE} />}
										</Pressable>
									);
								})
							)}
						</View>
					</BottomSheetView>
				</BottomSheetModal>
			</BottomSheetModalProvider>
		</GestureHandlerRootView>
	);
}
