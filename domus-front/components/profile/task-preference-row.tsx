import React from "react";
import { Pressable, Text, View } from "react-native";
import { ThumbsDown, ThumbsUp } from "lucide-react-native";
import type {
	PreferenceValue,
	TaskPreference,
} from "@/mocks/mock-task-preferences";

const BLUE = "#3A63FA";

const cardShadow = {
	shadowColor: "#111827",
	shadowOffset: { width: 0, height: 3 },
	shadowOpacity: 0.04,
	shadowRadius: 10,
	elevation: 1,
};

type TaskPreferenceRowProps = {
	task: TaskPreference;
	value: PreferenceValue;
	onChange: (next: PreferenceValue) => void;
};

export function TaskPreferenceRow({
	task,
	value,
	onChange,
}: TaskPreferenceRowProps) {
	const Icon = task.icon;

	// Cada botón alterna entre su estado activo y neutral.
	const toggle = (target: Exclude<PreferenceValue, "neutral">) =>
		onChange(value === target ? "neutral" : target);

	const isLiked = value === "like";
	const isDisliked = value === "dislike";

	return (
		<View
			className="min-h-[72px] flex-row items-center gap-4 rounded-2xl bg-white px-4 py-3"
			style={cardShadow}
		>
			<View
				className="h-11 w-11 items-center justify-center rounded-2xl"
				style={{ backgroundColor: task.tint }}
			>
				<Icon size={22} color={task.iconColor} />
			</View>

			<Text
				className="min-w-0 flex-1 text-base font-nunito-bold text-gray-900"
				numberOfLines={1}
			>
				{task.name}
			</Text>

			<View className="flex-row items-center gap-2.5">
				<Pressable
					onPress={() => toggle("dislike")}
					accessibilityRole="button"
					accessibilityState={{ selected: isDisliked }}
					accessibilityLabel={`No me gusta ${task.name}`}
					className={`h-11 w-11 items-center justify-center rounded-full border ${
						isDisliked ? "border-gray-800 bg-gray-800" : "border-gray-300 bg-white"
					}`}
				>
					<ThumbsDown
						size={20}
						color={isDisliked ? "#FFFFFF" : "#9CA3AF"}
						fill={isDisliked ? "#FFFFFF" : "transparent"}
					/>
				</Pressable>

				<Pressable
					onPress={() => toggle("like")}
					accessibilityRole="button"
					accessibilityState={{ selected: isLiked }}
					accessibilityLabel={`Me gusta ${task.name}`}
					className={`h-11 w-11 items-center justify-center rounded-full border ${
						isLiked ? "bg-white" : "border-gray-300 bg-white"
					}`}
					style={isLiked ? { borderColor: BLUE, borderWidth: 2 } : undefined}
				>
					<ThumbsUp
						size={20}
						color={isLiked ? BLUE : "#9CA3AF"}
						fill={isLiked ? BLUE : "transparent"}
					/>
				</Pressable>
			</View>
		</View>
	);
}
