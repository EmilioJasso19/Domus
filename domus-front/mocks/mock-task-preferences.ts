import {
	CookingPot,
	Trash2,
	Utensils,
	type LucideIcon,
} from "lucide-react-native";

export type PreferenceValue = "neutral" | "like" | "dislike";

export type TaskPreference = {
	id: string;
	name: string;
	icon: LucideIcon;
	tint: string;
	iconColor: string;
	value: PreferenceValue;
};

// Mock inicial — el backend de preferencias aún no está disponible.
export const INITIAL_TASK_PREFERENCES: TaskPreference[] = [
	{
		id: "wash-dishes",
		name: "Lavar platos",
		icon: Utensils,
		tint: "#EFF6FF",
		iconColor: "#3A63FA",
		value: "like",
	},
	{
		id: "take-trash",
		name: "Sacar basura",
		icon: Trash2,
		tint: "#F3F4F6",
		iconColor: "#374151",
		value: "dislike",
	},
	{
		id: "clean-kitchen",
		name: "Limpiar cocina",
		icon: CookingPot,
		tint: "#EFF6FF",
		iconColor: "#3A63FA",
		value: "neutral",
	},
];
