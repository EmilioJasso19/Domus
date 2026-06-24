import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	Pressable,
	ScrollView,
	TextInput,
	ActivityIndicator,
	RefreshControl,
	Platform,
	UIManager,
	Alert,
} from "react-native";
import { Search, Sparkles } from "lucide-react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import {
	getTasks,
	toggleTaskCompletion,
	assignAllForHome,
	type ApiTask,
} from "@/api/tasks";
import { getHomeMembers } from "@/api/homes";
import { HouseholdMember } from "@/constants/types";
import { useHomeStore } from "@/store/home-store";
import { useAuthStore } from "@/store/auth-store";
import { TaskCard, type TaskCardModel } from "@/components/tasks/task-card";
import { TaskSection } from "@/components/tasks/task-section";
import { BACKGROUND, BLUE } from "@/constants/colors";
import { SectionEmpty } from "@/components/section-empty";
import { EmptyState } from "@/components/empty-state";

// LayoutAnimation (used by the collapsible sections) needs to be enabled on Android.
if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TaskFilter = "pending" | "completed";

// Una ocurrencia con fecha más allá de este umbral se considera "lejana": al
// asignarla ahora, preferencias y horarios pueden cambiar antes de su fecha.
const FAR_DUE_THRESHOLD_DAYS = 7;

// ── Date helpers ────────────────────────────────────────────────────────────
function toDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function dueKey(task: ApiTask): string {
	return task.due_date ? task.due_date.slice(0, 10) : "";
}

function buildDateBadge(
	key: string,
	todayKey: string,
	tomorrowKey: string,
): string {
	if (!key) return "Sin fecha";
	if (key < todayKey) return "Atrasada";
	if (key === todayKey) return "Hoy";
	if (key === tomorrowKey) return "Mañana";
	return new Date(`${key}T00:00:00`).toLocaleDateString("es-MX", {
		day: "numeric",
		month: "short",
	});
}

export default function TasksScreen() {
	const router = useRouter();
	const { householdIdSelected } = useHomeStore();
	const refreshKey = useHomeStore((s) => s.refreshKey);
	const { user } = useAuthStore();

	const [tasks, setTasks] = useState<ApiTask[]>([]);
	const [members, setMembers] = useState<HouseholdMember[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isAssigning, setIsAssigning] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [filter, setFilter] = useState<TaskFilter>("pending");
	const [search, setSearch] = useState("");
	const [searchFocused, setSearchFocused] = useState(false);
	const [hoyExpanded, setHoyExpanded] = useState(true);
	const [proximasExpanded, setProximasExpanded] = useState(true);

	const { todayKey, tomorrowKey } = useMemo(() => {
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(now.getDate() + 1);
		return { todayKey: toDateKey(now), tomorrowKey: toDateKey(tomorrow) };
	}, []);

	const loadData = useCallback(
		async (showRefresh = false) => {
			if (!householdIdSelected) {
				setTasks([]);
				setMembers([]);
				setIsLoading(false);
				setIsRefreshing(false);
				return;
			}

			if (showRefresh) setIsRefreshing(true);
			else setIsLoading(true);
			setError(null);

			const [tasksResult, membersResult] = await Promise.allSettled([
				getTasks({ home_id: householdIdSelected }),
				getHomeMembers(householdIdSelected),
			]);

			if (tasksResult.status === "fulfilled") {
				setTasks(tasksResult.value);
			} else {
				setTasks([]);
				setError("No pudimos cargar las tareas del hogar.");
			}

			setMembers(
				membersResult.status === "fulfilled" ? membersResult.value : [],
			);

			setIsLoading(false);
			setIsRefreshing(false);
		},
		[householdIdSelected],
	);

	useFocusEffect(
		useCallback(() => {
			loadData();
		}, [loadData]),
	);

	// Una mutación de tareas (completar/reasignar/eliminar) incrementa refreshKey;
	// refrescamos la lista aunque la pantalla ya esté montada y enfocada. Se omite
	// la primera ejecución para no duplicar la carga inicial del useFocusEffect.
	const didMountRef = useRef(false);
	useEffect(() => {
		if (!didMountRef.current) {
			didMountRef.current = true;
			return;
		}
		loadData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [refreshKey]);

	// Resolve responsible members so each card can show a name + initials chip.
	const memberMap = useMemo(() => {
		const map = new Map<
			string,
			{ name: string; initials: string; colorIndex: number }
		>();
		members.forEach((member, index) => {
			const initials =
				`${member.name?.[0] ?? ""}${member.paternal_surname?.[0] ?? ""}`.toUpperCase();
			map.set(member.user_id, { name: member.name, initials, colorIndex: index });
		});
		return map;
	}, [members]);

	const toModel = useCallback(
		(task: ApiTask): TaskCardModel => {
			const member = task.responsible_id
				? memberMap.get(task.responsible_id)
				: undefined;
			return {
				id: task.id,
				name: task.name,
				frequency: task.frequency_type,
				isCompleted: task.is_completed,
				responsibleName: member?.name ?? null,
				responsibleInitials: member?.initials ?? null,
				responsibleColorIndex: member?.colorIndex ?? 0,
				dateBadge: buildDateBadge(dueKey(task), todayKey, tomorrowKey),
			};
		},
		[memberMap, todayKey, tomorrowKey],
	);

	const { hoy, proximas, completed } = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();
		const matchesSearch = (task: ApiTask) =>
			!normalizedSearch || task.name.toLowerCase().includes(normalizedSearch);

		const visible = tasks.filter(matchesSearch);
		const pending = visible.filter((task) => !task.is_completed);

		return {
			hoy: pending.filter((task) => dueKey(task) <= todayKey),
			proximas: pending.filter((task) => dueKey(task) > todayKey),
			completed: visible.filter((task) => task.is_completed),
		};
	}, [tasks, search, todayKey]);

	const handleOpen = useCallback(
		(id: string) => router.push(`/tasks/${id}`),
		[router],
	);

	const handleToggle = useCallback(async (id: string) => {
		// Optimistic flip; revert if the backend rejects (e.g. not the responsible).
		setTasks((prev) =>
			prev.map((task) =>
				task.id === id ? { ...task, is_completed: !task.is_completed } : task,
			),
		);
		try {
			await toggleTaskCompletion(id);
		} catch (err: any) {
			setTasks((prev) =>
				prev.map((task) =>
					task.id === id ? { ...task, is_completed: !task.is_completed } : task,
				),
			);
			Toast.show({
				type: "error",
				text1: "No se pudo actualizar la tarea",
				text2:
					err?.response?.data?.message ??
					"Solo el responsable puede completarla.",
			});
		}
	}, []);

	// Pending occurrences that nobody is responsible for yet — the ones the
	// auto-assignment algorithm can act on.
	const unassignedCount = useMemo(
		() =>
			tasks.filter((task) => !task.completed_at && !task.responsible_id).length,
		[tasks],
	);

	const performAssignAll = useCallback(async () => {
		if (!householdIdSelected) return;
		setIsAssigning(true);
		try {
			const result = await assignAllForHome(householdIdSelected);
			await loadData(true);
			if (result.unassigned.length > 0) {
				Toast.show({
					type: "info",
					text1: `${result.assigned.length} tarea(s) asignada(s)`,
					text2: `${result.unassigned.length} sin nadie disponible.`,
				});
			} else {
				Toast.show({
					type: "success",
					text1: "Pendientes asignadas",
					text2: `${result.assigned.length} tarea(s) repartida(s).`,
				});
			}
		} catch (err: any) {
			Toast.show({
				type: "error",
				text1: "No se pudieron asignar las tareas",
				text2:
					err?.response?.data?.message ?? "Ocurrió un error inesperado.",
			});
		} finally {
			setIsAssigning(false);
		}
	}, [householdIdSelected, loadData]);

	const handleAssignAll = useCallback(() => {
		if (!householdIdSelected || isAssigning) return;

		// Umbral = hoy + N días. Las pendientes sin responsable cuya fecha lo
		// rebase son "lejanas": avisamos antes de asignar.
		const threshold = new Date();
		threshold.setDate(threshold.getDate() + FAR_DUE_THRESHOLD_DAYS);
		const thresholdKey = toDateKey(threshold);

		const hasFarTasks = tasks.some(
			(task) =>
				!task.completed_at &&
				!task.responsible_id &&
				dueKey(task) > thresholdKey,
		);

		if (hasFarTasks) {
			Alert.alert(
				"Asignar tareas",
				"Algunas tareas tienen una fecha de entrega lejana. Como las preferencias y los horarios de disponibilidad pueden cambiar antes de esa fecha, la asignación podría volverse imprecisa. ¿Quieres asignarlas de todos modos?",
				[
					{ text: "Cancelar", style: "cancel" },
					{ text: "Asignar de todos modos", onPress: () => performAssignAll() },
				],
			);
			return;
		}

		performAssignAll();
	}, [householdIdSelected, isAssigning, tasks, performAssignAll]);

	const userInitials =
		`${user?.name?.[0] ?? ""}${user?.paternal_surname?.[0] ?? ""}`.toUpperCase();

	const pendingCount = hoy.length + proximas.length;

	return (
		<View className="flex-1" style={{ backgroundColor: BACKGROUND }}>
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-5 pb-12"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={() => loadData(true)}
						tintColor={BLUE}
						colors={[BLUE]}
					/>
				}
			>
				<Text className="mb-4 px-5 pt-5 pb-4 text-2xl font-nunito-extrabold text-gray-900">
					Tareas
				</Text>

				{/* ── Search ── */}
				<View
					className={`mb-5 h-14 flex-row items-center gap-3 rounded-2xl border ${searchFocused ? "" : "border-gray-200"} bg-white px-4`}
					style={searchFocused ? { borderColor: BLUE } : undefined}
				>
					<Search size={20} color="#9CA3AF" />
					<TextInput
						value={search}
						onChangeText={setSearch}
						placeholder="Buscar tareas..."
						placeholderTextColor="#9CA3AF"
						returnKeyType="search"
						accessibilityLabel="Buscar tareas"
						onFocus={() => setSearchFocused(true)}
						onBlur={() => setSearchFocused(false)}
						className="flex-1 text-base font-nunito text-gray-900"
					/>
				</View>

				{/* ── Filter tabs ── */}
				<View className="mb-6 flex-row gap-3">
					<FilterPill
						label="Pendientes"
						active={filter === "pending"}
						onPress={() => setFilter("pending")}
					/>
					<FilterPill
						label="Completadas"
						active={filter === "completed"}
						onPress={() => setFilter("completed")}
					/>
				</View>

				{/* ── Assign pending ── */}
				{filter === "pending" && unassignedCount > 0 ? (
					<AssignPendingButton
						count={unassignedCount}
						loading={isAssigning}
						onPress={handleAssignAll}
					/>
				) : null}

				{/* ── Content ── */}
				{isLoading ? (
					<ActivityIndicator color={BLUE} className="my-12" />
				) : error ? (
					<ErrorState message={error} onRetry={() => loadData()} />
				) : !householdIdSelected ? (
					<EmptyState
						title="Selecciona un hogar"
						subtitle="Cuando tengas un hogar activo, aquí verás sus tareas."
					/>
				) : filter === "pending" ? (
					pendingCount === 0 ? (
						<EmptyState
							title="No hay tareas pendientes 🎉"
							subtitle="Tu hogar está al día."
						/>
					) : (
						<View className="gap-6">
							<TaskSection
								title="Hoy"
								count={hoy.length}
								expanded={hoyExpanded}
								onToggle={() => setHoyExpanded((prev) => !prev)}
							>
								{hoy.length === 0 ? (
									<SectionEmpty message="Nada para hoy." />
								) : (
									hoy.map((task) => (
										<TaskCard
											key={task.id}
											task={toModel(task)}
											onToggle={handleToggle}
											onPress={handleOpen}
										/>
									))
								)}
							</TaskSection>

							<TaskSection
								title="Próximas"
								count={proximas.length}
								expanded={proximasExpanded}
								onToggle={() => setProximasExpanded((prev) => !prev)}
							>
								{proximas.length === 0 ? (
									<SectionEmpty message="No hay tareas próximas." />
								) : (
									proximas.map((task) => (
										<TaskCard
											key={task.id}
											task={toModel(task)}
											onToggle={handleToggle}
											onPress={handleOpen}
										/>
									))
								)}
							</TaskSection>
						</View>
					)
				) : completed.length === 0 ? (
					<EmptyState
						title="Aún no hay tareas completadas"
						subtitle="Las tareas que el hogar termine aparecerán aquí."
					/>
				) : (
					<View className="gap-3">
						{completed.map((task) => (
							<TaskCard
								key={task.id}
								task={toModel(task)}
								onToggle={handleToggle}
								onPress={handleOpen}
							/>
						))}
					</View>
				)}
			</ScrollView>
		</View>
	);
}

function FilterPill({
	label,
	active,
	onPress,
}: {
	label: string;
	active: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
			className={`min-h-[40px] items-center justify-center rounded-full px-5 ${active ? "bg-blue-600" : "border border-gray-200 bg-white"
				}`}
		>
			<Text
				className={`text-sm font-nunito-bold ${active ? "text-white" : "text-gray-600"
					}`}
			>
				{label}
			</Text>
		</Pressable>
	);
}

function AssignPendingButton({
	count,
	loading,
	onPress,
}: {
	count: number;
	loading: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			disabled={loading}
			accessibilityRole="button"
			accessibilityState={{ disabled: loading }}
			className={`mb-6 min-h-[52px] flex-row items-center justify-center gap-2 rounded-2xl px-5 ${loading ? "bg-blue-400" : "bg-blue-600"
				}`}
		>
			{loading ? (
				<ActivityIndicator color="#fff" size="small" />
			) : (
				<Sparkles size={18} color="#fff" />
			)}
			<Text className="text-sm font-nunito-bold text-white">
				{loading
					? "Asignando..."
					: `Asignar pendientes (${count})`}
			</Text>
		</Pressable>
	);
}

function ErrorState({
	message,
	onRetry,
}: {
	message: string;
	onRetry: () => void;
}) {
	return (
		<View className="mt-6 items-center rounded-3xl bg-white px-8 py-10">
			<Text className="text-center text-base font-nunito text-gray-600">
				{message}
			</Text>
			<Pressable
				onPress={onRetry}
				className="mt-4 min-h-[44px] items-center justify-center rounded-full bg-blue-600 px-6"
			>
				<Text className="text-sm font-nunito-bold text-white">Reintentar</Text>
			</Pressable>
		</View>
	);
}
