import React, { useState } from "react";
import {
	View,
	Text,
	Pressable,
	ScrollView,
	Platform,
	LayoutAnimation,
	UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Clock, Plus, ChevronDown, ChevronUp } from "lucide-react-native";
import { Calendar } from "react-native-calendars";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SavedBlockCard } from "@/components/profile/saved-block-card";

if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BACKGROUND = "#FAFAF8";
const BLUE = "#3A63FA";
const GREEN = "#86E29A";
const GREEN_PRESSED = "#6FD389";

type Mode = "recurrent" | "temporal";
type PickerTarget = "recFrom" | "recTo" | "tempFrom" | "tempTo" | null;

type RecurrentBlock = {
	id: string;
	dayId: number;
	from: string;
	to: string;
};

type TemporalBlock = {
	id: string;
	startDate: string;
	endDate: string;
	from: string;
	to: string;
};

const DAYS = [
	{ id: 0, label: "L", name: "Lunes" },
	{ id: 1, label: "M", name: "Martes" },
	{ id: 2, label: "M", name: "Miércoles" },
	{ id: 3, label: "J", name: "Jueves" },
	{ id: 4, label: "V", name: "Viernes" },
	{ id: 5, label: "S", name: "Sábado" },
	{ id: 6, label: "D", name: "Domingo" },
];

const formatTime = (date: Date) =>
	date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});

const makeTime = (hours: number, minutes: number) => {
	const d = new Date();
	d.setHours(hours, minutes, 0, 0);
	return d;
};

const displayDate = (iso: string) =>
	iso ? iso.split("-").reverse().join("/") : "dd/mm/yyyy";

const shortDate = (iso: string) =>
	new Date(`${iso}T00:00:00`).toLocaleDateString("es-MX", {
		day: "numeric",
		month: "short",
	});

const today = new Date().toISOString().split("T")[0];

export default function AvailabilityScreen() {
	const router = useRouter();

	const [mode, setMode] = useState<Mode>("recurrent");
	const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

	// ── Recurrente ──
	const [selectedDays, setSelectedDays] = useState<number[]>([1]);
	const [recFrom, setRecFrom] = useState<Date>(makeTime(18, 0));
	const [recTo, setRecTo] = useState<Date>(makeTime(21, 0));
	const [recBlocks, setRecBlocks] = useState<RecurrentBlock[]>([
		{ id: "rec-1", dayId: 1, from: "6:00 PM", to: "9:00 PM" },
	]);

	// ── Temporal ──
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [tempFrom, setTempFrom] = useState<Date>(makeTime(18, 0));
	const [tempTo, setTempTo] = useState<Date>(makeTime(21, 0));
	const [tempBlocks, setTempBlocks] = useState<TemporalBlock[]>([]);
	const [showStartCal, setShowStartCal] = useState(false);
	const [showEndCal, setShowEndCal] = useState(false);

	const switchMode = (next: Mode) => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setMode(next);
	};

	const toggleDay = (dayId: number) =>
		setSelectedDays((prev) =>
			prev.includes(dayId)
				? prev.filter((d) => d !== dayId)
				: [...prev, dayId],
		);

	const pickerValue = (() => {
		switch (pickerTarget) {
			case "recFrom":
				return recFrom;
			case "recTo":
				return recTo;
			case "tempFrom":
				return tempFrom;
			case "tempTo":
				return tempTo;
			default:
				return new Date();
		}
	})();

	const handleTimeChange = (selected?: Date) => {
		if (!selected) return;
		switch (pickerTarget) {
			case "recFrom":
				return setRecFrom(selected);
			case "recTo":
				return setRecTo(selected);
			case "tempFrom":
				return setTempFrom(selected);
			case "tempTo":
				return setTempTo(selected);
		}
	};

	const handleAddRecurrent = () => {
		if (selectedDays.length === 0) return;
		const from = formatTime(recFrom);
		const to = formatTime(recTo);

		setRecBlocks((prev) => {
			const next = [...prev];
			selectedDays.forEach((dayId) => {
				const idx = next.findIndex((b) => b.dayId === dayId);
				if (idx >= 0) {
					next[idx] = { ...next[idx], from, to };
				} else {
					next.push({ id: `rec-${dayId}-${Date.now()}`, dayId, from, to });
				}
			});
			return next.sort((a, b) => a.dayId - b.dayId);
		});
	};

	const handleAddTemporal = () => {
		if (!startDate || !endDate) return;
		setTempBlocks((prev) => [
			...prev,
			{
				id: `temp-${Date.now()}`,
				startDate,
				endDate,
				from: formatTime(tempFrom),
				to: formatTime(tempTo),
			},
		]);
		setStartDate("");
		setEndDate("");
	};

	const canAddTemporal = Boolean(startDate && endDate);

	return (
		<View className="flex-1" style={{ backgroundColor: BACKGROUND }}>
			{/* ── Header ── */}
			<View className="flex-row items-center px-5 pb-3 pt-4">
				<Pressable
					onPress={() => router.back()}
					accessibilityRole="button"
					accessibilityLabel="Volver"
					hitSlop={8}
					className="h-9 w-9 items-center justify-center"
				>
					<ArrowLeft size={24} color={BLUE} />
				</Pressable>
				<Text className="flex-1 text-center text-xl font-nunito-bold text-gray-900 -ml-9">
					Disponibilidad
				</Text>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerClassName="px-5 pb-10 pt-2"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* ── Selector de modo ── */}
				<View className="mb-6 flex-row rounded-2xl bg-gray-200 p-1">
					{(
						[
							{ key: "recurrent", label: "Recurrente" },
							{ key: "temporal", label: "Temporal" },
						] as { key: Mode; label: string }[]
					).map((option) => {
						const active = mode === option.key;
						return (
							<Pressable
								key={option.key}
								onPress={() => switchMode(option.key)}
								accessibilityRole="button"
								accessibilityState={{ selected: active }}
								className={`h-11 flex-1 items-center justify-center rounded-xl ${
									active ? "bg-white" : ""
								}`}
							>
								<Text
									className="text-base"
									style={{
										fontFamily: active
											? "Nunito_700Bold"
											: "Nunito_600SemiBold",
										color: active ? BLUE : "#6B7280",
									}}
								>
									{option.label}
								</Text>
							</Pressable>
						);
					})}
				</View>

				{mode === "recurrent" ? (
					<>
						{/* ── Selección de días ── */}
						<Text className="mb-3 text-base font-nunito-bold text-gray-800">
							Seleccionar Días
						</Text>
						<View className="mb-6 flex-row justify-between">
							{DAYS.map((day) => {
								const active = selectedDays.includes(day.id);
								return (
									<Pressable
										key={day.id}
										onPress={() => toggleDay(day.id)}
										accessibilityRole="button"
										accessibilityState={{ selected: active }}
										accessibilityLabel={day.name}
										className={`h-10 w-10 items-center justify-center rounded-full ${
											active ? "" : "bg-gray-200"
										}`}
										style={active ? { backgroundColor: BLUE } : undefined}
									>
										<Text
											className="text-base"
											style={{
												fontFamily: "Nunito_700Bold",
												color: active ? "#FFFFFF" : "#374151",
											}}
										>
											{day.label}
										</Text>
									</Pressable>
								);
							})}
						</View>

						{/* ── Desde / Hasta ── */}
						<View className="mb-6 flex-row gap-4">
							<TimeField
								label="Desde"
								value={formatTime(recFrom)}
								onPress={() => setPickerTarget("recFrom")}
							/>
							<TimeField
								label="Hasta"
								value={formatTime(recTo)}
								onPress={() => setPickerTarget("recTo")}
							/>
						</View>

						<AddButton
							label="Agregar"
							disabled={selectedDays.length === 0}
							onPress={handleAddRecurrent}
						/>

						{/* ── Bloques guardados ── */}
						<Text className="mb-3 mt-8 text-base font-nunito-bold text-gray-800">
							Bloques Guardados
						</Text>
						{recBlocks.length === 0 ? (
							<EmptyBlocks />
						) : (
							<View className="gap-3">
								{recBlocks.map((block) => (
									<SavedBlockCard
										key={block.id}
										title={DAYS[block.dayId].name}
										subtitle={`${block.from} - ${block.to}`}
										onDelete={() =>
											setRecBlocks((prev) =>
												prev.filter((b) => b.id !== block.id),
											)
										}
									/>
								))}
							</View>
						)}
					</>
				) : (
					<>
						{/* ── Rango de fechas ── */}
						<DateField
							label="Fecha de inicio"
							value={displayDate(startDate)}
							hasValue={Boolean(startDate)}
							open={showStartCal}
							onPress={() => {
								LayoutAnimation.configureNext(
									LayoutAnimation.Presets.easeInEaseOut,
								);
								setShowEndCal(false);
								setShowStartCal((p) => !p);
							}}
						/>
						{showStartCal && (
							<View className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white">
								<Calendar
									onDayPress={(day) => {
										setStartDate(day.dateString);
										if (endDate && day.dateString > endDate) setEndDate("");
										LayoutAnimation.configureNext(
											LayoutAnimation.Presets.easeInEaseOut,
										);
										setShowStartCal(false);
									}}
									markedDates={
										startDate
											? { [startDate]: { selected: true, selectedColor: BLUE } }
											: {}
									}
									minDate={today}
									theme={calendarTheme}
								/>
							</View>
						)}

						<View className="mt-4">
							<DateField
								label="Fecha de fin"
								value={displayDate(endDate)}
								hasValue={Boolean(endDate)}
								open={showEndCal}
								onPress={() => {
									LayoutAnimation.configureNext(
										LayoutAnimation.Presets.easeInEaseOut,
									);
									setShowStartCal(false);
									setShowEndCal((p) => !p);
								}}
							/>
						</View>
						{showEndCal && (
							<View className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white">
								<Calendar
									onDayPress={(day) => {
										setEndDate(day.dateString);
										LayoutAnimation.configureNext(
											LayoutAnimation.Presets.easeInEaseOut,
										);
										setShowEndCal(false);
									}}
									markedDates={
										endDate
											? { [endDate]: { selected: true, selectedColor: BLUE } }
											: {}
									}
									minDate={startDate || today}
									theme={calendarTheme}
								/>
							</View>
						)}

						{/* ── Desde / Hasta ── */}
						<View className="mb-6 mt-6 flex-row gap-4">
							<TimeField
								label="Desde"
								value={formatTime(tempFrom)}
								onPress={() => setPickerTarget("tempFrom")}
							/>
							<TimeField
								label="Hasta"
								value={formatTime(tempTo)}
								onPress={() => setPickerTarget("tempTo")}
							/>
						</View>

						<AddButton
							label="Agregar"
							disabled={!canAddTemporal}
							onPress={handleAddTemporal}
						/>

						{/* ── Bloques temporales guardados ── */}
						<Text className="mb-3 mt-8 text-base font-nunito-bold text-gray-800">
							Bloques Guardados
						</Text>
						{tempBlocks.length === 0 ? (
							<EmptyBlocks />
						) : (
							<View className="gap-3">
								{tempBlocks.map((block) => (
									<SavedBlockCard
										key={block.id}
										title={`${shortDate(block.startDate)} - ${shortDate(
											block.endDate,
										)}`}
										subtitle={`${block.from} - ${block.to}`}
										accentColor="#1A7330"
										onDelete={() =>
											setTempBlocks((prev) =>
												prev.filter((b) => b.id !== block.id),
											)
										}
									/>
								))}
							</View>
						)}
					</>
				)}
			</ScrollView>

			{pickerTarget && (
				<DateTimePicker
					value={pickerValue}
					mode="time"
					display={Platform.OS === "ios" ? "spinner" : "default"}
					onChange={(event, selected) => {
						setPickerTarget(Platform.OS === "ios" ? pickerTarget : null);
						if (event.type === "set") handleTimeChange(selected);
					}}
				/>
			)}

			{/* iOS: botón para cerrar el spinner */}
			{pickerTarget && Platform.OS === "ios" && (
				<Pressable
					onPress={() => setPickerTarget(null)}
					className="items-center pb-8 pt-2"
				>
					<Text
						className="text-base font-nunito-bold"
						style={{ color: BLUE }}
					>
						Listo
					</Text>
				</Pressable>
			)}
		</View>
	);
}

const calendarTheme = {
	todayTextColor: BLUE,
	selectedDayBackgroundColor: BLUE,
	arrowColor: BLUE,
	textDayFontFamily: "Nunito_400Regular",
	textMonthFontFamily: "Nunito_700Bold",
	textDayHeaderFontFamily: "Nunito_600SemiBold",
};

function TimeField({
	label,
	value,
	onPress,
}: {
	label: string;
	value: string;
	onPress: () => void;
}) {
	return (
		<View className="flex-1">
			<Text className="mb-2 text-base font-nunito-bold text-gray-800">
				{label}
			</Text>
			<Pressable
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel={`${label}: ${value}`}
				className="h-14 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4"
			>
				<Text className="text-base font-nunito-semibold text-gray-900">
					{value}
				</Text>
				<Clock size={18} color="#6B7280" />
			</Pressable>
		</View>
	);
}

function DateField({
	label,
	value,
	hasValue,
	open,
	onPress,
}: {
	label: string;
	value: string;
	hasValue: boolean;
	open: boolean;
	onPress: () => void;
}) {
	return (
		<View>
			<Text className="mb-2 text-base font-nunito-bold text-gray-800">
				{label}
			</Text>
			<Pressable
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel={`${label}: ${value}`}
				className="h-14 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4"
			>
				<Text
					className={`text-base font-nunito-semibold ${
						hasValue ? "text-gray-900" : "text-gray-400"
					}`}
				>
					{value}
				</Text>
				{open ? (
					<ChevronUp size={18} color="#6B7280" />
				) : (
					<ChevronDown size={18} color="#6B7280" />
				)}
			</Pressable>
		</View>
	);
}

function AddButton({
	label,
	disabled,
	onPress,
}: {
	label: string;
	disabled: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled }}
			className="h-14 flex-row items-center justify-center gap-2 rounded-2xl"
			style={({ pressed }) => ({
				backgroundColor: disabled
					? "#D1D5DB"
					: pressed
						? GREEN_PRESSED
						: GREEN,
			})}
		>
			<Plus size={20} color="#111827" strokeWidth={2.5} />
			<Text className="text-base font-nunito-bold text-gray-900">{label}</Text>
		</Pressable>
	);
}

function EmptyBlocks() {
	return (
		<View className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6">
			<Text className="text-center text-sm font-nunito text-gray-400">
				Aún no has guardado bloques de disponibilidad.
			</Text>
		</View>
	);
}
