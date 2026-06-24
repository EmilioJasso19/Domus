import React, { useEffect, useState } from "react";
import { BLUE as APP_BLUE } from "@/constants/colors";
import {
	View,
	Text,
	Pressable,
	ScrollView,
	TextInput,
	Platform,
	LayoutAnimation,
	UIManager,
	ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
	ArrowLeft,
	Calendar as CalendarIcon,
	ChevronDown,
	ChevronUp,
	Clock,
	RefreshCw,
	CheckCircle2,
	X,
} from "lucide-react-native";
import { Calendar } from "react-native-calendars";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "@/api/axios";
import { useHomeStore } from "@/store/home-store";
import {
	getTaskOccurrence,
	assignOccurrenceToUser,
	EFFORT_LABELS,
} from "@/api/tasks";

if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Frequency = "once" | "daily" | "weekly" | "monthly";

type Member = {
	user_id: string;
	name: string;
	paternal_surname: string;
	maternal_surname?: string;
	role: string;
};

// "auto" representa el responsable Automático (responsible_id: null al enviar)
type ResponsibleSelection = "auto" | string;

const FREQUENCIES: { key: Frequency; label: string }[] = [
	{ key: "once", label: "Una vez" },
	{ key: "daily", label: "Diario" },
	{ key: "weekly", label: "Semanal" },
	{ key: "monthly", label: "Mensual" },
];

const EFFORT_LEVELS: { value: number; label: string }[] = [1, 2, 3, 4, 5].map(
	(value) => ({ value, label: EFFORT_LABELS[value] }),
);

const BLUE = "#2563EB";
// Azul primario del sistema (#3A63FA) para el estado de foco de los inputs.
// Se importa con alias porque este módulo ya define un BLUE local distinto.
const FOCUS_BLUE = APP_BLUE;

// "HH:MM:SS" -> Date (today at that time), for prefilling the time picker in edit mode.
function timeStringToDate(time: string): Date {
	const [h, m, s] = time.split(":").map(Number);
	const d = new Date();
	d.setHours(h ?? 0, m ?? 0, s ?? 0, 0);
	return d;
}

export default function CreateTask() {
	const router = useRouter();
	const { householdIdSelected } = useHomeStore();

	// Editing an existing occurrence: route is /tasks/create?id=<occurrenceId>.
	const { id: editId } = useLocalSearchParams<{ id?: string }>();
	const isEditing = !!editId;

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [nameFocused, setNameFocused] = useState(false);
	const [descFocused, setDescFocused] = useState(false);
	const [dueDate, setDueDate] = useState<string>(""); // YYYY-MM-DD
	const [dueTime, setDueTime] = useState<Date | null>(null);
	const [frequency, setFrequency] = useState<Frequency>("daily");
	const [responsible, setResponsible] = useState<ResponsibleSelection>("auto");
	const [physicalEffort, setPhysicalEffort] = useState<number>(3);
	// Tracks the originally-loaded values so edit mode only fires the calls it needs.
	const [editTaskId, setEditTaskId] = useState<string | null>(null);
	const [initialResponsible, setInitialResponsible] =
		useState<ResponsibleSelection>("auto");

	const [members, setMembers] = useState<Member[]>([]);
	const [showCalendar, setShowCalendar] = useState(false);
	const [showTimePicker, setShowTimePicker] = useState(false);
	const [showMore, setShowMore] = useState(true);
	const [isLoadingTask, setIsLoadingTask] = useState(isEditing);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	useEffect(() => {
		if (!householdIdSelected) return;
		axios
			.get(`/homes/members/${householdIdSelected}`)
			.then((res) => {
				setMembers(res.data)
			})
			.catch(() => setMembers([]));
	}, [householdIdSelected]);

	// Prefill the form when editing an existing occurrence.
	useEffect(() => {
		if (!editId) return;
		let active = true;
		setIsLoadingTask(true);
		getTaskOccurrence(editId)
			.then((task) => {
				if (!active) return;
				setName(task.name);
				setDescription(task.description ?? "");
				setDueDate(task.due_date.slice(0, 10));
				setDueTime(task.due_time ? timeStringToDate(task.due_time) : null);
				setFrequency(task.frequency_type);
				setPhysicalEffort(task.physical_effort);
				setEditTaskId(task.task_id);
				const initial = task.responsible_id ?? "auto";
				setResponsible(initial);
				setInitialResponsible(initial);
			})
			.catch(() =>
				setSubmitError("No pudimos cargar la tarea para editar."),
			)
			.finally(() => active && setIsLoadingTask(false));
		return () => {
			active = false;
		};
	}, [editId]);

	const toggleCalendar = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setShowCalendar((p) => !p);
	};
	const toggleMore = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setShowMore((p) => !p);
	};

	const displayDate = dueDate
		? dueDate.split("-").reverse().join("/")
		: "dd/mm/yyyy";

	const displayTime = dueTime
		? dueTime.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
		: null;

	// 24h "HH:MM" for the API (the backend validates ^([01]\d|2[0-3]):[0-5]\d$).
	const payloadTime = dueTime
		? `${String(dueTime.getHours()).padStart(2, "0")}:${String(
				dueTime.getMinutes(),
			).padStart(2, "0")}`
		: undefined;

	const initials = (m: Member) =>
		`${m.name[0] ?? ""}${m.paternal_surname[0] ?? ""}`.toUpperCase();

	const handleSubmit = async () => {
		if (!name.trim() || !dueDate) return;
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			if (isEditing && editId && editTaskId) {
				// Template fields live on the task; date/time live on the occurrence.
				await axios.patch(`/tasks/${editTaskId}`, {
					name: name.trim(),
					description: description.trim() || undefined,
					physical_effort: physicalEffort,
					frequency_type: frequency,
				});
				await axios.patch(`/task-occurrences/${editId}`, {
					due_date: dueDate,
					due_time: payloadTime ?? null,
				});
				// Manual responsible changes go through the assign endpoint.
				if (responsible !== "auto" && responsible !== initialResponsible) {
					await assignOccurrenceToUser(editId, responsible);
				}
			} else {
				await axios.post("/tasks", {
					name: name.trim(),
					description: description.trim() || undefined,
					home_id: householdIdSelected,
					responsible_id: responsible === "auto" ? null : responsible,
					due_date: dueDate,
					due_time: payloadTime,
					frequency_type: frequency,
					physical_effort: physicalEffort,
				});
			}
			router.back();
		} catch {
			setSubmitError(
				isEditing
					? "Error al guardar los cambios. Inténtalo de nuevo."
					: "Error al crear la tarea. Por favor, inténtalo de nuevo.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<View className="flex-1 bg-slate-50">
			{/* ── Header propio ── */}
			<View className="flex-row items-center px-5 pt-5 pb-4">
				<Pressable
					onPress={() => router.back()}
					className="w-9 h-9 items-center justify-center"
				>
					<ArrowLeft size={24} color="#111827" />
				</Pressable>
				<Text className="flex-1 text-center text-xl font-nunito-bold text-gray-900 -ml-9">
					{isEditing ? "Editar tarea" : "Nueva tarea"}
				</Text>
			</View>

			{ submitError && (
				<View className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-5 mb-4">
					<Text className="text-sm">{submitError}</Text>
				</View>
			) }

			{isLoadingTask ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator color={BLUE} />
				</View>
			) : (
			<>
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-5 pb-8"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* ── Nombre (input grande sin borde, como la referencia) ── */}
				<TextInput
					value={name}
					onChangeText={setName}
					placeholder="Ej. Sacar la basura"
					placeholderTextColor="#A5B4CB"
					onFocus={() => setNameFocused(true)}
					onBlur={() => setNameFocused(false)}
					className={`text-2xl font-nunito-bold text-gray-900 py-3 border-b ${nameFocused ? "" : "border-gray-200"} mb-6`}
					style={nameFocused ? { borderBottomColor: FOCUS_BLUE } : undefined}
				/>

				{/* ── Fecha límite (acordeón con calendario) ── */}
				<Text className="text-sm font-nunito-bold text-gray-700 mb-2">
					Fecha límite
				</Text>
				<Pressable
					onPress={toggleCalendar}
					className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 h-14"
				>
					<CalendarIcon size={18} color="#6B7280" />
					<Text
						className={`flex-1 ml-3 text-base font-nunito ${
							dueDate ? "text-gray-900" : "text-gray-400"
						}`}
					>
						{displayDate}
					</Text>
					{showCalendar ? (
						<ChevronUp size={18} color="#6B7280" />
					) : (
						<ChevronDown size={18} color="#6B7280" />
					)}
				</Pressable>

				{showCalendar && (
					<View className="bg-white border border-gray-200 rounded-2xl mt-2 overflow-hidden">
						<Calendar
							onDayPress={(day) => {
								setDueDate(day.dateString);
								toggleCalendar();
							}}
							markedDates={
								dueDate
									? { [dueDate]: { selected: true, selectedColor: BLUE } }
									: {}
							}
							minDate={new Date().toISOString().split("T")[0]}
							theme={{
								todayTextColor: BLUE,
								selectedDayBackgroundColor: BLUE,
								arrowColor: BLUE,
								textDayFontFamily: "Nunito_400Regular",
								textMonthFontFamily: "Nunito_700Bold",
								textDayHeaderFontFamily: "Nunito_600SemiBold",
							}}
						/>
					</View>
				)}

				{/* ── Hora límite (opcional) ── */}
				<Pressable
					onPress={() => setShowTimePicker(true)}
					className="flex-row items-center mt-3 self-start"
				>
					<Clock size={16} color={BLUE} />
					<Text className="ml-2 text-sm font-nunito-semibold text-blue-600">
						{displayTime ? `Hora: ${displayTime}` : "Agregar hora (opcional)"}
					</Text>
					{displayTime && (
						<Pressable onPress={() => setDueTime(null)} className="ml-2">
							<X size={14} color="#9CA3AF" />
						</Pressable>
					)}
				</Pressable>

				{showTimePicker && (
					<DateTimePicker
						value={dueTime ?? new Date()}
						mode="time"
						is24Hour
						display={Platform.OS === "ios" ? "spinner" : "default"}
						onChange={(event, selected) => {
							setShowTimePicker(Platform.OS === "ios"); // Android cierra solo
							if (event.type === "set" && selected) setDueTime(selected);
						}}
					/>
				)}

				{/* ── Frecuencia (segmented control) ── */}
				<Text className="text-sm font-nunito-bold text-gray-700 mt-6 mb-2">
					Frecuencia
				</Text>
				<View className="flex-row bg-gray-200/70 rounded-2xl p-1">
					{FREQUENCIES.map((f) => {
						const active = frequency === f.key;
						return (
							<Pressable
								key={f.key}
								onPress={() => setFrequency(f.key)}
								className={`flex-1 h-11 items-center justify-center rounded-xl ${
									active ? "bg-white" : ""
								}`}
							>
								<Text
									className={`text-sm ${
										active
											? "font-nunito-bold text-gray-900"
											: "font-nunito-semibold text-gray-500"
									}`}
								>
									{f.label}
								</Text>
							</Pressable>
						);
					})}
				</View>

				{/* ── Más opciones (acordeón) ── */}
				<View className="h-px bg-gray-200 my-6" />
				<Pressable
					onPress={toggleMore}
					className="flex-row items-center justify-between"
				>
					<Text className="text-lg font-nunito-extrabold text-gray-900">
						Más opciones
					</Text>
					{showMore ? (
						<ChevronUp size={20} color="#374151" />
					) : (
						<ChevronDown size={20} color="#374151" />
					)}
				</Pressable>

				{showMore && (
					<View className="mt-4">
						{/* Responsable */}
						<Text className="text-sm font-nunito-bold text-gray-700 mb-3">
							Responsable
						</Text>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerClassName="gap-4"
						>
							{/* Automático */}
							<Pressable
								onPress={() => setResponsible("auto")}
								className="items-center w-16"
							>
								<View
									className={`w-14 h-14 rounded-full items-center justify-center ${
										responsible === "auto"
											? "bg-blue-600 border-2 border-blue-300"
											: "bg-blue-600"
									}`}
								>
									<RefreshCw size={22} color="#fff" />
								</View>
								<Text className="text-xs font-nunito text-gray-600 mt-1.5">
									Automático
								</Text>
							</Pressable>

							{/* Miembros */}
							{members.map((m) => {
								const active = responsible === m.user_id;
								return (
									<Pressable
										key={m.user_id}
										onPress={() => setResponsible(m.user_id)}
										className="items-center w-16"
									>
										<View
											className={`w-14 h-14 rounded-full items-center justify-center bg-gray-200 ${
												active ? "border-2 border-blue-500" : ""
											}`}
										>
											<Text className="text-base font-nunito-bold text-gray-600">
												{initials(m)}
											</Text>
										</View>
										<Text
											className="text-xs font-nunito text-gray-600 mt-1.5"
											numberOfLines={1}
										>
											{m.name}
										</Text>
									</Pressable>
								);
							})}
						</ScrollView>

						{/* Esfuerzo físico */}
						<Text className="text-sm font-nunito-bold text-gray-700 mt-6 mb-3">
							Esfuerzo físico
						</Text>
						<View className="flex-row flex-wrap gap-2">
							{EFFORT_LEVELS.map((level) => {
								const active = physicalEffort === level.value;
								return (
									<Pressable
										key={level.value}
										onPress={() => setPhysicalEffort(level.value)}
										accessibilityRole="button"
										accessibilityState={{ selected: active }}
										className={`h-10 items-center justify-center rounded-full px-4 ${
											active
												? "bg-blue-600"
												: "bg-white border border-gray-200"
										}`}
									>
										<Text
											className={`text-sm ${
												active
													? "font-nunito-bold text-white"
													: "font-nunito-semibold text-gray-600"
											}`}
										>
											{level.label}
										</Text>
									</Pressable>
								);
							})}
						</View>

						{/* Descripción */}
						<Text className="text-sm font-nunito-bold text-gray-700 mt-6 mb-2">
							Descripción
						</Text>
						<TextInput
							value={description}
							onChangeText={setDescription}
							placeholder="Agrega detalles opcionales..."
							placeholderTextColor="#9CA3AF"
							multiline
							numberOfLines={4}
							textAlignVertical="top"
							onFocus={() => setDescFocused(true)}
							onBlur={() => setDescFocused(false)}
							className={`bg-white border ${descFocused ? "" : "border-gray-200"} rounded-2xl px-4 py-3 text-base font-nunito text-gray-900 min-h-[110px]`}
							style={descFocused ? { borderColor: FOCUS_BLUE } : undefined}
						/>
					</View>
				)}
			</ScrollView>

			{/* ── CTA fijo abajo ── */}
			<View className="px-5 pb-10 pt-3 bg-slate-50">
				<Pressable
					onPress={handleSubmit}
					disabled={isSubmitting || !name.trim() || !dueDate}
					className={`flex-row items-center justify-center gap-2 rounded-2xl h-14 ${
						isSubmitting || !name.trim() || !dueDate
							? "bg-blue-400"
							: "bg-blue-600 active:bg-blue-700"
					}`}
				>
					{isSubmitting ? (
						<ActivityIndicator color="#fff" />
					) : (
						<>
							<CheckCircle2 size={20} color="#fff" />
							<Text className="text-white text-base font-nunito-bold tracking-wide">
								{isEditing ? "Guardar cambios" : "Crear tarea"}
							</Text>
						</>
					)}
				</Pressable>
			</View>
			</>
			)}
		</View>
	);
}