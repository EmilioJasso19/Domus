import { useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, ListChecks } from "lucide-react-native";
import { TaskPreferenceRow } from "@/components/profile/task-preference-row";
import type { PreferenceValue } from "@/mocks/mock-task-preferences";
import { BACKGROUND, BLUE } from "@/constants/colors";
import { Preference } from "@/constants/types";
import { getPreferences, saveManyPreferences } from "@/api/preferences";
import { useHomeStore } from "@/store/home-store";

// El backend trabaja con un score numérico (-1 = like / 0 = neutral / 1 = dislike);
// un score bajo abarata el costo de asignación. El componente de fila usa un valor
// semántico. Convertimos en ambas direcciones.
const scoreToValue = (score: number): PreferenceValue =>
	score < 0 ? "like" : score > 0 ? "dislike" : "neutral";

const valueToScore = (value: PreferenceValue): number =>
	value === "like" ? -1 : value === "dislike" ? 1 : 0;

export default function TaskPreferencesScreen() {
	const router = useRouter();
	const { householdIdSelected } = useHomeStore();

	// Copia original (snapshot) tal como vino del backend.
	const [original, setOriginal] = useState<Preference[]>([]);
	// Copia editable que refleja la UI.
	const [preferences, setPreferences] = useState<Preference[]>([]);

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchPreferences = async () => {
			if (!householdIdSelected) return;
			setLoading(true);
			setError(null);
			try {
				const prefs = await getPreferences(householdIdSelected);
				setOriginal(prefs);
				setPreferences(prefs);
			} catch (err) {
				console.error("Error fetching preferences:", err);
				setError("No se pudieron cargar las preferencias.");
			} finally {
				setLoading(false);
			}
		};

		fetchPreferences();
	}, [householdIdSelected]);

	// Mapa task_id -> score original, para comparar cambios reales de score.
	const originalScores = useMemo(() => {
		const map = new Map<string, number>();
		original.forEach((pref) => map.set(pref.task_id, pref.score));
		return map;
	}, [original]);

	// Solo las preferencias cuyo score difiere del original.
	const dirtyItems = useMemo(
		() =>
			preferences.filter(
				(pref) => pref.score !== originalScores.get(pref.task_id)
			),
		[preferences, originalScores]
	);

	const isDirty = dirtyItems.length > 0;

	// Actualiza únicamente el estado local; no llama al backend.
	const handleChange = (taskId: string, nextValue: PreferenceValue) => {
		const nextScore = valueToScore(nextValue);
		setSaved(false);
		setPreferences((prev) =>
			prev.map((pref) =>
				pref.task_id === taskId ? { ...pref, score: nextScore } : pref
			)
		);
	};

	const handleSave = async () => {
		if (!householdIdSelected || !isDirty || saving) return;
		setSaving(true);
		setError(null);
		try {
			await saveManyPreferences(
				dirtyItems.map((pref) => ({
					task_id: pref.task_id,
					score: pref.score,
				})),
				householdIdSelected
			);
			// Éxito: el estado actual pasa a ser el nuevo snapshot original.
			setOriginal(preferences);
			setSaved(true);
		} catch (err) {
			console.error("Error saving preferences:", err);
			setError("No se pudieron guardar los cambios.");
		} finally {
			setSaving(false);
		}
	};

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
					<ArrowLeft size={24} color="#374151" />
				</Pressable>
				<Text
					className="flex-1 text-center text-xl font-nunito-bold -ml-9"
					style={{ color: BLUE }}
				>
					Preferencias de tareas
				</Text>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerClassName="px-5 pb-32 pt-4"
				showsVerticalScrollIndicator={false}
			>
				<Text className="mb-6 text-base font-nunito-regular leading-6 text-gray-500">
					Estas preferencias ayudan a mejorar la asignación automática de
					tareas.
				</Text>

				{loading ? (
					<View className="items-center py-16">
						<ActivityIndicator color={BLUE} />
					</View>
				) : preferences.length === 0 ? (
					<View className="items-center gap-3 py-16">
						<ListChecks size={40} color="#9CA3AF" />
						<Text className="text-center text-base font-nunito-regular text-gray-500">
							Aún no hay tareas en este hogar.
						</Text>
					</View>
				) : (
					<View className="gap-4">
						{preferences.map((pref) => (
							<TaskPreferenceRow
								key={pref.task_id}
								task={{
									id: pref.task_id,
									name: pref.task.name,
									icon: ListChecks,
									tint: "#EFF6FF",
									iconColor: BLUE,
									value: scoreToValue(pref.score),
								}}
								value={scoreToValue(pref.score)}
								onChange={(next) => handleChange(pref.task_id, next)}
							/>
						))}
					</View>
				)}

				{error ? (
					<Text className="mt-4 text-center text-sm font-nunito-medium text-red-600">
						{error}
					</Text>
				) : null}

				{saved && !isDirty ? (
					<View className="mt-4 flex-row items-center justify-center gap-2">
						<Check size={18} color="#1A7330" />
						<Text
							className="text-sm font-nunito-semibold"
							style={{ color: "#1A7330" }}
						>
							Cambios guardados
						</Text>
					</View>
				) : null}
			</ScrollView>

			{/* ── Botón Guardar: visible solo cuando hay cambios pendientes ── */}
			{isDirty ? (
				<View className="absolute inset-x-0 bottom-0 px-5 pb-8 pt-3">
					<Pressable
						onPress={handleSave}
						disabled={saving}
						accessibilityRole="button"
						accessibilityLabel="Guardar cambios"
						className="h-14 items-center justify-center rounded-2xl"
						style={{ backgroundColor: BLUE, opacity: saving ? 0.6 : 1 }}
					>
						{saving ? (
							<ActivityIndicator color="#FFFFFF" />
						) : (
							<Text className="text-base font-nunito-bold text-white">
								Guardar cambios
							</Text>
						)}
					</Pressable>
				</View>
			) : null}
		</View>
	);
}
