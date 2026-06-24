import { useCallback, useMemo, useState } from "react";
import {
	View,
	Text,
	Pressable,
	ScrollView,
	ActivityIndicator,
	Modal,
	Alert,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
	ArrowLeft,
	EllipsisVertical,
	Calendar as CalendarIcon,
	Clock,
	Repeat,
	ArrowLeftRight,
	Dumbbell,
	Pencil,
	Trash2,
	CheckCircle2,
	X,
} from "lucide-react-native";
import Toast from "react-native-toast-message";
import {
	getTaskOccurrence,
	toggleTaskCompletion,
	assignOccurrenceToUser,
	deleteTaskOccurrence,
	EFFORT_LABELS,
	type ApiTask,
	type TaskFrequency,
} from "@/api/tasks";
import { getHomeMembers } from "@/api/homes";
import { HouseholdMember } from "@/constants/types";
import { useHomeStore } from "@/store/home-store";
import { BACKGROUND, BLUE } from "@/constants/colors";

const SUCCESS = "#1A7330";

const FREQUENCY_LABELS: Record<TaskFrequency, string> = {
	once: "Una vez",
	daily: "Diario",
	weekly: "Semanal",
	monthly: "Mensual",
};

const MONTHS_ES = [
	"Enero",
	"Febrero",
	"Marzo",
	"Abril",
	"Mayo",
	"Junio",
	"Julio",
	"Agosto",
	"Septiembre",
	"Octubre",
	"Noviembre",
	"Diciembre",
];

const cardShadow = {
	shadowColor: "#111827",
	shadowOffset: { width: 0, height: 3 },
	shadowOpacity: 0.04,
	shadowRadius: 10,
	elevation: 1,
};

// "2026-06-12" -> "12 Junio 2026"
function formatLongDate(dueDate: string): string {
	const [y, m, d] = dueDate.slice(0, 10).split("-").map(Number);
	if (!y || !m || !d) return dueDate;
	return `${d} ${MONTHS_ES[m - 1]} ${y}`;
}

// "18:00:00" -> "6:00 PM"
function formatTime12(time: string): string {
	const [h, m] = time.split(":").map(Number);
	const period = h >= 12 ? "PM" : "AM";
	const hour12 = h % 12 === 0 ? 12 : h % 12;
	return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

function formatCompletedAt(iso: string): string {
	const date = new Date(iso);
	return date.toLocaleString("es-MX", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function memberFullName(m: HouseholdMember): string {
	return `${m.name} ${m.paternal_surname}`.trim();
}

function memberInitials(m: HouseholdMember): string {
	return `${m.name?.[0] ?? ""}${m.paternal_surname?.[0] ?? ""}`.toUpperCase();
}

export default function TaskDetailScreen() {
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();
	const { householdIdSelected } = useHomeStore();

	const [task, setTask] = useState<ApiTask | null>(null);
	const [members, setMembers] = useState<HouseholdMember[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isToggling, setIsToggling] = useState(false);

	const [menuOpen, setMenuOpen] = useState(false);
	const [reassignOpen, setReassignOpen] = useState(false);
	const [isReassigning, setIsReassigning] = useState(false);

	const loadData = useCallback(async () => {
		if (!id) return;
		setIsLoading(true);
		setError(null);
		const [taskResult, membersResult] = await Promise.allSettled([
			getTaskOccurrence(id),
			householdIdSelected
				? getHomeMembers(householdIdSelected)
				: Promise.resolve([] as HouseholdMember[]),
		]);

		if (taskResult.status === "fulfilled") {
			setTask(taskResult.value);
		} else {
			setError("No pudimos cargar la tarea.");
		}
		setMembers(
			membersResult.status === "fulfilled" ? membersResult.value : [],
		);
		setIsLoading(false);
	}, [id, householdIdSelected]);

	useFocusEffect(
		useCallback(() => {
			loadData();
		}, [loadData]),
	);

	const responsible = useMemo(
		() =>
			task?.responsible_id
				? members.find((m) => m.user_id === task.responsible_id) ?? null
				: null,
		[task?.responsible_id, members],
	);

	const handleToggle = useCallback(async () => {
		if (!id || isToggling) return;
		setIsToggling(true);
		try {
			const updated = await toggleTaskCompletion(id);
			setTask(updated);
		} catch (err: any) {
			Toast.show({
				type: "error",
				text1: "No se pudo actualizar la tarea",
				text2:
					err?.response?.data?.message ??
					"Solo el responsable puede completarla.",
			});
		} finally {
			setIsToggling(false);
		}
	}, [id, isToggling]);

	const handleReassign = useCallback(
		async (userId: string) => {
			if (!id) return;
			setIsReassigning(true);
			try {
				await assignOccurrenceToUser(id, userId);
				setReassignOpen(false);
				await loadData();
				Toast.show({ type: "success", text1: "Responsable actualizado" });
			} catch (err: any) {
				Toast.show({
					type: "error",
					text1: "No se pudo reasignar",
					text2:
						err?.response?.data?.message ?? "Ocurrió un error inesperado.",
				});
			} finally {
				setIsReassigning(false);
			}
		},
		[id, loadData],
	);

	const handleEdit = useCallback(() => {
		setMenuOpen(false);
		router.push(`/tasks/create?id=${id}`);
	}, [id, router]);

	const handleDelete = useCallback(() => {
		setMenuOpen(false);
		Alert.alert(
			"Eliminar tarea",
			"¿Seguro que quieres eliminar esta tarea? Esta acción no se puede deshacer.",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Eliminar",
					style: "destructive",
					onPress: async () => {
						try {
							await deleteTaskOccurrence(id);
							router.back();
						} catch (err: any) {
							Toast.show({
								type: "error",
								text1: "No se pudo eliminar la tarea",
								text2:
									err?.response?.data?.message ??
									"Ocurrió un error inesperado.",
							});
						}
					},
				},
			],
		);
	}, [id, router]);

	return (
		<View className="flex-1" style={{ backgroundColor: BACKGROUND }}>
			{/* ── Header ── */}
			<View className="flex-row items-center px-5 pt-5 pb-3">
				<Pressable
					onPress={() => router.back()}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel="Volver"
					className="w-9 h-9 items-center justify-center"
				>
					<ArrowLeft size={24} color="#111827" />
				</Pressable>
				<Text className="flex-1 text-center text-xl font-nunito-bold text-gray-900">
					Detalle de tarea
				</Text>
				<Pressable
					onPress={() => setMenuOpen(true)}
					hitSlop={8}
					disabled={!task}
					accessibilityRole="button"
					accessibilityLabel="Más opciones"
					className="w-9 h-9 items-center justify-center"
				>
					<EllipsisVertical size={24} color="#111827" />
				</Pressable>
			</View>

			{isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator color={BLUE} />
				</View>
			) : error || !task ? (
				<View className="flex-1 items-center justify-center px-8">
					<Text className="text-center text-base font-nunito text-gray-600">
						{error ?? "Tarea no encontrada."}
					</Text>
					<Pressable
						onPress={loadData}
						className="mt-4 min-h-[44px] items-center justify-center rounded-full bg-blue-600 px-6"
					>
						<Text className="text-sm font-nunito-bold text-white">
							Reintentar
						</Text>
					</Pressable>
				</View>
			) : (
				<>
					<ScrollView
						className="flex-1"
						contentContainerClassName="px-5 pb-8"
						showsVerticalScrollIndicator={false}
					>
						{/* ── Status badge ── */}
						<StatusBadge completed={task.is_completed} />

						{/* ── Name ── */}
						<Text className="mt-3 text-2xl font-nunito-extrabold text-gray-900">
							{task.name}
						</Text>

						{/* ── Description ── */}
						{task.description ? (
							<Text className="mt-2 text-base font-nunito text-gray-600 leading-6">
								{task.description}
							</Text>
						) : null}

						{/* ── Responsible ── */}
						<DetailCard className="mt-6">
							<View className="flex-row items-center">
								<View className="h-12 w-12 items-center justify-center rounded-full bg-gray-200">
									<Text className="text-sm font-nunito-bold text-gray-700">
										{responsible ? memberInitials(responsible) : "—"}
									</Text>
								</View>
								<View className="ml-3 flex-1">
									<CardLabel>RESPONSABLE</CardLabel>
									<Text className="mt-0.5 text-lg font-nunito-bold text-gray-900">
										{responsible
											? memberFullName(responsible)
											: "Sin asignar"}
									</Text>
								</View>
								<Pressable
									onPress={() => setReassignOpen(true)}
									hitSlop={8}
									accessibilityRole="button"
									accessibilityLabel="Reasignar responsable"
									className="w-9 h-9 items-center justify-center"
								>
									<ArrowLeftRight size={20} color="#6B7280" />
								</Pressable>
							</View>
						</DetailCard>

						{/* ── Due date ── */}
						<DetailCard className="mt-3">
							<CardRow icon={<CalendarIcon size={16} color="#6B7280" />}>
								FECHA LÍMITE
							</CardRow>
							<Text className="mt-1 text-lg font-nunito-bold text-gray-900">
								{formatLongDate(task.due_date)}
							</Text>
						</DetailCard>

						{/* ── Due time (only if present) ── */}
						{task.due_time ? (
							<DetailCard className="mt-3">
								<CardRow icon={<Clock size={16} color="#6B7280" />}>
									HORA LÍMITE
								</CardRow>
								<Text className="mt-1 text-lg font-nunito-bold text-gray-900">
									{formatTime12(task.due_time)}
								</Text>
							</DetailCard>
						) : null}

						{/* ── Frequency ── */}
						<DetailCard className="mt-3">
							<CardRow icon={<Repeat size={16} color="#6B7280" />}>
								FRECUENCIA
							</CardRow>
							<Text className="mt-1 text-lg font-nunito-bold text-gray-900">
								{FREQUENCY_LABELS[task.frequency_type]}
							</Text>
						</DetailCard>

						{/* ── Physical effort ── */}
						<DetailCard className="mt-3">
							<CardRow icon={<Dumbbell size={16} color="#6B7280" />}>
								ESFUERZO FÍSICO
							</CardRow>
							<View className="mt-1 flex-row items-center justify-between">
								<Text className="text-lg font-nunito-bold text-gray-900">
									{EFFORT_LABELS[task.physical_effort] ?? "—"}
								</Text>
								<EffortDots value={task.physical_effort} />
							</View>
						</DetailCard>

						{/* ── Completion info ── */}
						{task.completed_at ? (
							<View className="mt-4 flex-row items-center gap-2">
								<CheckCircle2 size={18} color={SUCCESS} />
								<Text className="text-sm font-nunito-semibold text-gray-600">
									Completada el {formatCompletedAt(task.completed_at)}
								</Text>
							</View>
						) : null}
					</ScrollView>

					{/* ── Bottom actions ── */}
					<View
						className="px-5 pb-10 pt-3"
						style={{ backgroundColor: BACKGROUND }}
					>
						<Pressable
							onPress={handleToggle}
							disabled={isToggling}
							accessibilityRole="button"
							className="flex-row items-center justify-center gap-2 rounded-2xl h-14 bg-blue-600"
						>
							{isToggling ? (
								<ActivityIndicator color="#fff" />
							) : (
								<>
									<CheckCircle2 size={20} color="#fff" />
									<Text className="text-white text-base font-nunito-bold">
										{task.is_completed
											? "Marcar como pendiente"
											: "Marcar como completada"}
									</Text>
								</>
							)}
						</Pressable>

						<Pressable
							onPress={handleEdit}
							accessibilityRole="button"
							className="mt-3 flex-row items-center justify-center rounded-2xl h-14 bg-white border border-gray-200"
						>
							<Text className="text-gray-800 text-base font-nunito-bold">
								Editar tarea
							</Text>
						</Pressable>
					</View>
				</>
			)}

			{/* ── Overflow menu ── */}
			<ActionSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
				<ActionItem
					icon={<Pencil size={20} color="#374151" />}
					label="Editar"
					onPress={handleEdit}
				/>
				<ActionItem
					icon={<ArrowLeftRight size={20} color="#374151" />}
					label="Reasignar"
					onPress={() => {
						setMenuOpen(false);
						setReassignOpen(true);
					}}
				/>
				<ActionItem
					icon={<Trash2 size={20} color="#DC2626" />}
					label="Eliminar"
					destructive
					onPress={handleDelete}
				/>
			</ActionSheet>

			{/* ── Reassign member picker ── */}
			<ActionSheet
				visible={reassignOpen}
				onClose={() => setReassignOpen(false)}
				title="Reasignar a"
			>
				{members.length === 0 ? (
					<Text className="px-5 py-4 text-base font-nunito text-gray-500">
						No hay miembros en este hogar.
					</Text>
				) : (
					members.map((m) => {
						const active = m.user_id === task?.responsible_id;
						return (
							<Pressable
								key={m.user_id}
								onPress={() => handleReassign(m.user_id)}
								disabled={isReassigning}
								className="flex-row items-center px-5 py-3"
							>
								<View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200">
									<Text className="text-sm font-nunito-bold text-gray-700">
										{memberInitials(m)}
									</Text>
								</View>
								<Text className="ml-3 flex-1 text-base font-nunito-semibold text-gray-900">
									{memberFullName(m)}
								</Text>
								{active ? (
									<CheckCircle2 size={20} color={BLUE} />
								) : null}
							</Pressable>
						);
					})
				)}
			</ActionSheet>
		</View>
	);
}

function StatusBadge({ completed }: { completed: boolean }) {
	return (
		<View
			className="flex-row items-center gap-2 self-start rounded-full px-3 py-1.5"
			style={{ backgroundColor: completed ? "#E3F2E7" : "#E6ECFF" }}
		>
			<View
				className="h-2 w-2 rounded-full"
				style={{ backgroundColor: completed ? SUCCESS : BLUE }}
			/>
			<Text
				className="text-sm font-nunito-bold"
				style={{ color: completed ? SUCCESS : BLUE }}
			>
				{completed ? "Completada" : "Pendiente"}
			</Text>
		</View>
	);
}

function DetailCard({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<View
			className={`rounded-2xl bg-white px-4 py-4 ${className ?? ""}`}
			style={cardShadow}
		>
			{children}
		</View>
	);
}

function CardLabel({ children }: { children: React.ReactNode }) {
	return (
		<Text className="text-xs font-nunito-bold tracking-wider text-gray-400">
			{children}
		</Text>
	);
}

function CardRow({
	icon,
	children,
}: {
	icon: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<View className="flex-row items-center gap-2">
			{icon}
			<CardLabel>{children}</CardLabel>
		</View>
	);
}

function EffortDots({ value }: { value: number }) {
	return (
		<View className="flex-row items-center gap-1.5">
			{[1, 2, 3, 4, 5].map((i) => (
				<View
					key={i}
					className="h-2.5 w-2.5 rounded-full"
					style={{ backgroundColor: i <= value ? BLUE : "#D1D5DB" }}
				/>
			))}
		</View>
	);
}

function ActionSheet({
	visible,
	onClose,
	title,
	children,
}: {
	visible: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
}) {
	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			<Pressable
				className="flex-1 justify-end"
				style={{ backgroundColor: "rgba(17,24,39,0.4)" }}
				onPress={onClose}
			>
				<Pressable
					className="rounded-t-3xl bg-white pb-10 pt-2"
					onPress={(e) => e.stopPropagation()}
				>
					<View className="my-2 h-1 w-10 self-center rounded-full bg-gray-300" />
					{title ? (
						<View className="flex-row items-center justify-between px-5 py-2">
							<Text className="text-lg font-nunito-extrabold text-gray-900">
								{title}
							</Text>
							<Pressable onPress={onClose} hitSlop={8}>
								<X size={22} color="#6B7280" />
							</Pressable>
						</View>
					) : null}
					{children}
				</Pressable>
			</Pressable>
		</Modal>
	);
}

function ActionItem({
	icon,
	label,
	onPress,
	destructive,
}: {
	icon: React.ReactNode;
	label: string;
	onPress: () => void;
	destructive?: boolean;
}) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			className="flex-row items-center gap-3 px-5 py-4"
		>
			{icon}
			<Text
				className="text-base font-nunito-semibold"
				style={{ color: destructive ? "#DC2626" : "#374151" }}
			>
				{label}
			</Text>
		</Pressable>
	);
}
