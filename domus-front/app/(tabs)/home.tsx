import { useCallback, useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	Pressable,
	ScrollView,
	ActivityIndicator,
	LayoutAnimation,
	Platform,
	UIManager,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
	ChevronDown,
	ChevronRight,
	Clock,
	User as UserIcon,
	ShoppingCart,
	Plus,
	Home as HomeIcon,
	Users as UsersIcon,
} from "lucide-react-native";
import {
	BottomSheetModal,
	BottomSheetModalProvider,
	BottomSheetView,
	BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import axios from "@/api/axios";
import { useAuthStore } from "@/store/auth-store";
import { HomeItem, Task } from "@/constants/types";
import { useHomeStore } from "@/store/home-store";
import { BACKGROUND } from "@/constants/colors";
import { PetDisplay } from "@/components/home/pet-display";
import { getPet } from "@/api/virtual-pet";

// Habilitar LayoutAnimation en Android (para el desplegable)
if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function DashboardScreen() {
	const router = useRouter();
	const { user } = useAuthStore();
	const { households, householdIdSelected, selectHome, setHouseholds, refreshHomes } = useHomeStore();
	const sheetRef = useRef<BottomSheetModal>(null);

	const [homes, setHomes] = useState<HomeItem[]>([]);
	const [upcoming, setUpcoming] = useState<Task[]>([]);
	const [completedToday, setCompletedToday] = useState<Task[]>([]);
	const [showCompleted, setShowCompleted] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [petName, setPetName] = useState("");

	const greeting = (() => {
		const h = new Date().getHours();
		if (h < 12) return "Buenos días";
		if (h < 19) return "Buenas tardes";
		return "Buenas noches";
	})();

	const todayLabel = new Date().toLocaleDateString("es-MX", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	useEffect(() => {
		axios
			.get("/homes/me")
			.then((res) => setHomes(res.data))
			.catch(() => setHomes([]));
	}, []);

	useFocusEffect(
		useCallback(() => {
			if (!householdIdSelected) setHouseholds([...households]);
			setIsLoading(true);

			// Los puntos del hogar cambian al completar tareas; re-sincroniza el
			// store al enfocar la vista para que el encabezado y la mascota
			// reflejen el valor actual.
			refreshHomes().catch(() => { });

			// Nombre de la mascota: independiente del bloque de tareas.
			if (householdIdSelected) {
				getPet(householdIdSelected)
					.then((pet) => setPetName(pet.name))
					.catch(() => { });
			}

			Promise.all([
				axios.get("/task-occurrences", {
					params: {
						home_id: householdIdSelected,
						user_id: user?.id,
						completed: "false",
					},
				}),

				axios.get("/task-occurrences", {
					params: {
						home_id: householdIdSelected,
						completed: "true",
						date: "today",
					},
				}),
			])
				.then(([upcomingRes, completedRes]) => {
					setUpcoming(upcomingRes.data);
					setCompletedToday(completedRes.data)
				})
				.catch(() => {
					setUpcoming([]);
					setCompletedToday([]);
				})
				.finally(() => setIsLoading(false));
		}, [householdIdSelected, refreshHomes])
	);

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
		[]
	);

	const handleSelectHome = (home: HomeItem) => {
		selectHome(home);
		sheetRef.current?.dismiss();
	};

	const toggleCompleted = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setShowCompleted((p) => !p);
	};

	useEffect(() => {
		if (!householdIdSelected) {
			router.replace("/");
		}
	}, [householdIdSelected]);

	if (!householdIdSelected) {
		return null;
	}

	const activeHome = households?.find((h) => h.id === householdIdSelected);

	return (
		<View className="flex-1">
			<BottomSheetModalProvider>
				<ScrollView
					className="flex-1"
					contentContainerClassName="px-5 pt-4 pb-8"
					showsVerticalScrollIndicator={false}
					style={{ backgroundColor: BACKGROUND }}
				>
					{/* ── Selector de casa ── */}
					<Pressable
						onPress={openHomeSelector}
						className="flex-row items-center gap-1 mb-3"
					>
						<Text className="text-base font-nunito-bold text-gray-900">
							{(() => {
								const home = households?.find((h) => h.id === householdIdSelected);
								return home
									? `${home.name} - ${home.points} pts`
									: "Selecciona un hogar";
							})()}
						</Text>
						<ChevronDown size={18} color="#374151" />
					</Pressable>

					{/* ── Saludo ── */}
					<Text className="text-[26px] font-nunito-extrabold text-gray-900">
						{greeting}, {user?.name}
					</Text>
					<Text className="text-sm font-nunito text-gray-500 capitalize mb-6">
						{todayLabel}
					</Text>

					{/* ── Próximas tareas ── */}
					<View className="flex-row items-center justify-between mb-3">
						<Text className="text-xl font-nunito-extrabold text-gray-900">
							Próximas tareas
						</Text>
						<Pressable onPress={() => router.push("/tasks")}>
							<Text className="text-sm font-nunito-semibold text-blue-600">
								Ver todas
							</Text>
						</Pressable>
					</View>

					{isLoading ? (
						<ActivityIndicator color="#2563EB" className="my-8" />
					) : upcoming.length === 0 ? (
						<View className="bg-white rounded-2xl p-6 items-center mb-6">
							<Text className="text-sm font-nunito text-gray-400 text-center">
								No tienes tareas pendientes. ¡Buen trabajo!
							</Text>
						</View>
					) : (
						<View className="gap-3 mb-6">
							{upcoming.map((task) => (
								<TaskRow key={task.id} task={task} />
							))}
						</View>
					)}

					{/* ── Completadas hoy (desplegable) ── */}
					{completedToday.length > 0 && (
						<View className="bg-white rounded-2xl mb-6 overflow-hidden">
							<Pressable
								onPress={toggleCompleted}
								className="flex-row items-center gap-2 px-4 py-4"
							>
								<ChevronRight
									size={18}
									color="#6B7280"
									style={{
										transform: [{ rotate: showCompleted ? "90deg" : "0deg" }],
									}}
								/>
								<Text className="text-sm font-nunito-semibold text-gray-700">
									Completadas hoy ({completedToday.length})
								</Text>
							</Pressable>

							{showCompleted && (
								<View className="px-4 pb-4 gap-3">
									{completedToday.map((task) => (
										<View
											key={task.id}
											className="flex-row items-center gap-3"
										>
											<View className="w-5 h-5 rounded-md bg-blue-600 items-center justify-center">
												<Text className="text-white text-[11px]">✓</Text>
											</View>
											<Text className="text-sm font-nunito text-gray-400 line-through flex-1">
												{task.name}
											</Text>
										</View>
									))}
								</View>
							)}
						</View>
					)}

					<PetDisplay
						points={Number(activeHome?.points ?? 0)}
						hasCompletionsToday={completedToday.length > 0}
						petName={petName}
						homeId={householdIdSelected}
						onNameSaved={setPetName}
					/>
				</ScrollView>

				{/* ── Bottom Sheet: selector de casa ── */}
				<BottomSheetModal
					ref={sheetRef}
					enableDynamicSizing
					backdropComponent={renderBackdrop}
					handleIndicatorStyle={{ backgroundColor: "#D1D5DB" }}
				>
					<BottomSheetView className="px-5 pt-2 pb-10">
						<Text className="text-lg font-nunito-extrabold text-gray-900 mb-4">
							Tus hogares
						</Text>

						<View className="gap-2 mb-4">
							{homes.map((home) => {
								const isSelected = home.id === householdIdSelected;
								return (
									<Pressable
										key={home.id}
										onPress={() => handleSelectHome(home)}
										className={`flex-row items-center gap-3 px-4 py-3 rounded-xl border ${isSelected
											? "border-blue-600 bg-blue-50"
											: "border-gray-200 bg-white"
											}`}
									>
										<View className="w-9 h-9 rounded-lg bg-blue-100 items-center justify-center">
											<HomeIcon size={18} color="#2563EB" />
										</View>
										<Text
											className={`text-base flex-1 ${isSelected
												? "font-nunito-bold text-blue-700"
												: "font-nunito-semibold text-gray-800"
												}`}
										>
											{home.name}
										</Text>
										{isSelected && (
											<Text className="text-blue-600 font-nunito-bold">✓</Text>
										)}
									</Pressable>
								);
							})}
						</View>

						{/* Acciones: crear / unirse */}
						<View className="gap-2 border-t border-gray-100 pt-4">
							<Pressable
								onPress={() => {
									sheetRef.current?.dismiss();
									router.push({
										pathname: "/",
										params: {
											initialMode: "create",
										},
									});
								}}
								className="flex-row items-center gap-3 px-4 py-3"
							>
								<View className="w-9 h-9 rounded-lg bg-blue-600 items-center justify-center">
									<Plus size={18} color="#fff" />
								</View>
								<Text className="text-base font-nunito-semibold text-gray-800">
									Crear un hogar
								</Text>
							</Pressable>

							<Pressable
								onPress={() => {
									sheetRef.current?.dismiss();
									router.push({
										pathname: "/",
										params: {
											initialMode: "join",
										},
									});
								}}
								className="flex-row items-center gap-3 px-4 py-3"
							>
								<View className="w-9 h-9 rounded-lg bg-gray-100 items-center justify-center">
									<UsersIcon size={18} color="#374151" />
								</View>
								<Text className="text-base font-nunito-semibold text-gray-800">
									Unirme a un hogar
								</Text>
							</Pressable>
						</View>
					</BottomSheetView>
				</BottomSheetModal>
			</BottomSheetModalProvider>
		</View>
	);
}

function TaskRow({ task }: { task: Task }) {
	return (
		<View className="bg-white rounded-2xl p-4 flex-row items-center gap-3">
			<View className="w-6 h-6 rounded-md border-2 border-gray-300" />
			<View className="flex-1">
				<Text className="text-base font-nunito-semibold text-gray-900 mb-1">
					{task.task.name}
				</Text>
				<View className="flex-row items-center gap-3">
					<View className="flex-row items-center gap-1">
						<Clock size={13} color="#EF4444" />
						<Text className="text-xs font-nunito text-red-500">
							{task.due_time ?? "Hoy"}
						</Text>
					</View>
					{/* {task.responsible_name && (
						<View className="flex-row items-center gap-1">
							<UserIcon size={13} color="#6B7280" />
							<Text className="text-xs font-nunito text-gray-500">
								{task.responsible_name}
							</Text>
						</View>
					)} */}
				</View>
			</View>
		</View>
	);
}
