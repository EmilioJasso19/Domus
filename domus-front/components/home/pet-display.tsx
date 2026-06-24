import { useEffect, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { Check } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { BLUE } from "@/constants/colors";
import { updatePetName } from "@/api/virtual-pet";

type PetDisplayProps = {
	points: number; // puntos del hogar
	hasCompletionsToday: boolean; // true si hay al menos 1 tarea completada hoy
	petName: string; // nombre actual de la mascota
	homeId: string; // PK de la mascota (= ID del hogar)
	onNameSaved?: (name: string) => void; // notifica al padre del nuevo nombre
};

// Etapas de crecimiento según los puntos del hogar. `max` es exclusivo: la etapa
// adulta no tiene techo (Infinity).
const STAGES = [
	{ key: "baby", label: "Bebé", min: 0, max: 500 },
	{ key: "teen", label: "Joven", min: 500, max: 1500 },
	{ key: "adult", label: "Adulto", min: 1500, max: Infinity },
] as const;

// Mapa estático de fuentes: los require() deben ser literales para que Metro los
// resuelva en tiempo de bundle.
const PET_SOURCES = {
	baby: {
		flickering: require("@/assets/pet/baby/flickering.gif"),
		greeting: require("@/assets/pet/baby/greeting.gif"),
		sad: require("@/assets/pet/baby/sad.gif"),
	},
	teen: {
		flickering: require("@/assets/pet/teen/flickering.gif"),
		greeting: require("@/assets/pet/teen/greeting.gif"),
		sad: require("@/assets/pet/teen/sad.gif"),
	},
	adult: {
		flickering: require("@/assets/pet/adult/flickering.gif"),
		greeting: require("@/assets/pet/adult/greeting.gif"),
		sad: require("@/assets/pet/adult/sad.gif"),
	},
} as const;

// La duración de cada cuadro del ciclo "feliz".
const FRAME_DELAYS = { flickering: 1000, greeting: 3000 } as const;

export function PetDisplay({
	points,
	hasCompletionsToday,
	petName,
	homeId,
	onNameSaved,
}: PetDisplayProps) {
	const [frame, setFrame] = useState<"flickering" | "greeting">("flickering");
	const [editingName, setEditingName] = useState(petName);
	const [savingName, setSavingName] = useState(false);

	useEffect(() => {
		if (!hasCompletionsToday) return; // triste: sin ciclo de animación
		const timer = setTimeout(() => {
			setFrame((prev) => (prev === "flickering" ? "greeting" : "flickering"));
		}, FRAME_DELAYS[frame]);
		return () => clearTimeout(timer);
	}, [frame, hasCompletionsToday]);

	// Re-sincroniza el campo editable cuando el padre trae un nombre nuevo
	// (carga inicial o refetch al enfocar la vista).
	useEffect(() => {
		setEditingName(petName);
	}, [petName]);

	const trimmedName = editingName.trim();
	const canSaveName =
		trimmedName.length > 0 && trimmedName !== petName && !savingName;

	const handleSaveName = async () => {
		if (!canSaveName) return;
		setSavingName(true);
		try {
			await updatePetName(homeId, trimmedName);
			onNameSaved?.(trimmedName);
			Toast.show({ type: "success", text1: "Nombre actualizado" });
		} catch (err: any) {
			Toast.show({
				type: "error",
				text1: err?.response?.data?.message ?? "No se pudo actualizar el nombre",
			});
		} finally {
			setSavingName(false);
		}
	};

	const stageIndex = points >= 1500 ? 2 : points >= 500 ? 1 : 0;
	const stage = STAGES[stageIndex];
	const mood = !hasCompletionsToday ? "sad" : frame;
	const source = PET_SOURCES[stage.key][mood];

	const isMaxStage = stageIndex === STAGES.length - 1;
	// Progreso (0–1) dentro de la etapa actual; la etapa adulta siempre va al tope.
	const progress = isMaxStage
		? 1
		: (points - stage.min) / (stage.max - stage.min);
	const pointsToNext = isMaxStage ? 0 : stage.max - points;

	return (
		<View>
			<View className="mb-4 flex-row items-center gap-2">
				<TextInput
					value={editingName}
					onChangeText={setEditingName}
					placeholder="Mascota"
					placeholderTextColor="#9CA3AF"
					maxLength={20}
					className="flex-1 text-xl font-nunito-extrabold text-gray-900"
				/>
				{canSaveName ? (
					<Pressable
						onPress={handleSaveName}
						hitSlop={8}
						accessibilityRole="button"
						accessibilityLabel="Guardar nombre de la mascota"
						className="h-9 w-9 items-center justify-center rounded-full bg-blue-50 active:bg-blue-100"
					>
						<Check size={20} color={BLUE} />
					</Pressable>
				) : null}
			</View>
			<Image
				source={source}
				className="w-full mb-4"
				style={{ resizeMode: "contain", height: 200 }}
			/>

			<View className="mb-1 flex-row items-center justify-between">
				<Text className="text-sm font-nunito-bold text-gray-900">
					{stage.label}
				</Text>
				<Text className="text-xs font-nunito text-gray-500">
					{isMaxStage
						? "Nivel máximo"
						: `${pointsToNext} pts para ${STAGES[stageIndex + 1].label}`}
				</Text>
			</View>
			<View className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
				<View
					className="h-full rounded-full"
					style={{
						width: `${Math.round(progress * 100)}%`,
						backgroundColor: BLUE,
					}}
				/>
			</View>
			<Text className="mt-1 text-xs font-nunito text-gray-400">
				{points} pts
			</Text>
		</View>
	);
}
