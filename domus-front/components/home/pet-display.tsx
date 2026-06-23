import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { BLUE } from "@/constants/colors";

type PetDisplayProps = {
	points: number; // puntos del hogar
	hasCompletionsToday: boolean; // true si hay al menos 1 tarea completada hoy
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

export function PetDisplay({ points, hasCompletionsToday }: PetDisplayProps) {
	const [frame, setFrame] = useState<"flickering" | "greeting">("flickering");

	useEffect(() => {
		if (!hasCompletionsToday) return; // triste: sin ciclo de animación
		const timer = setTimeout(() => {
			setFrame((prev) => (prev === "flickering" ? "greeting" : "flickering"));
		}, FRAME_DELAYS[frame]);
		return () => clearTimeout(timer);
	}, [frame, hasCompletionsToday]);

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
			<Text className="text-xl font-nunito-extrabold text-gray-900 mb-4">
				Mascota
			</Text>
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
