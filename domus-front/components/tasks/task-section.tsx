import type { ReactNode } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";

type TaskSectionProps = {
	title: string;
	count?: number;
	expanded: boolean;
	onToggle: () => void;
	children: ReactNode;
};

// Lightweight collapsible section used to group tasks (Hoy, Próximas,
// Completadas). Animates the expand/collapse with the shared LayoutAnimation.
export function TaskSection({
	title,
	count,
	expanded,
	onToggle,
	children,
}: TaskSectionProps) {
	const handleToggle = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		onToggle();
	};

	return (
		<View>
			<Pressable
				onPress={handleToggle}
				accessibilityRole="button"
				accessibilityState={{ expanded }}
				className="min-h-[44px] flex-row items-center justify-between py-1"
			>
				<View className="flex-row items-center gap-2">
					<Text className="text-xl font-nunito-extrabold text-gray-900">
						{title}
					</Text>
					{count !== undefined ? (
						<Text className="text-base font-nunito-semibold text-gray-400">
							{count}
						</Text>
					) : null}
				</View>
				{expanded ? (
					<ChevronUp size={20} color="#6B7280" />
				) : (
					<ChevronDown size={20} color="#6B7280" />
				)}
			</Pressable>

			{expanded ? <View className="mt-3 gap-3">{children}</View> : null}
		</View>
	);
}
