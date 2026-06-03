import React from "react";
import { Pressable, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";

const BLUE = "#3A63FA";

const cardShadow = {
	shadowColor: "#111827",
	shadowOffset: { width: 0, height: 3 },
	shadowOpacity: 0.04,
	shadowRadius: 10,
	elevation: 1,
};

type SavedBlockCardProps = {
	title: string;
	subtitle: string;
	onDelete: () => void;
	accentColor?: string;
};

export function SavedBlockCard({
	title,
	subtitle,
	onDelete,
	accentColor = BLUE,
}: SavedBlockCardProps) {
	return (
		<View
			className="min-h-[64px] flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3"
			style={cardShadow}
		>
			<View
				className="h-10 w-1.5 rounded-full"
				style={{ backgroundColor: accentColor }}
			/>

			<View className="min-w-0 flex-1">
				<Text
					className="text-base font-nunito-bold text-gray-900"
					numberOfLines={1}
				>
					{title}
				</Text>
				<Text className="mt-0.5 text-sm font-nunito text-gray-500" numberOfLines={1}>
					{subtitle}
				</Text>
			</View>

			<Pressable
				onPress={onDelete}
				accessibilityRole="button"
				accessibilityLabel={`Eliminar ${title}`}
				hitSlop={8}
				className="h-9 w-9 items-center justify-center rounded-full active:bg-gray-100"
			>
				<Trash2 size={20} color="#6B7280" />
			</Pressable>
		</View>
	);
}
