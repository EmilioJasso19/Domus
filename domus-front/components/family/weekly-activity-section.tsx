import { WeeklyActivityItem } from "@/constants/types";
import { PartyPopper } from "lucide-react-native";
import { Text, View } from "react-native";

const cardShadow = {
	shadowColor: "#111827",
	shadowOffset: { width: 0, height: 4 },
	shadowOpacity: 0.04,
	shadowRadius: 12,
	elevation: 1,
};

type WeeklyActivitySectionProps = {
	items: WeeklyActivityItem[];
};

export function WeeklyActivitySection({ items }: WeeklyActivitySectionProps) {
	return (
		<View className="rounded-3xl bg-white p-6" style={cardShadow}>
			<View className="mb-6 flex-row items-center gap-3">
				<PartyPopper size={24} color="#9A3412" />
				<Text className="text-2xl font-nunito-extrabold text-gray-900">
					Actividad de la semana
				</Text>
			</View>

			{items.length === 0 ? (
				<Text className="text-base font-nunito leading-6 text-gray-500">
					Aún no hay tareas completadas esta semana.
				</Text>
			) : (
				<View className="gap-5">
					{items.map((item, index) => (
						<View
							key={item.userId}
							className="min-h-[36px] flex-row items-center gap-4"
						>
							<Text className="w-7 text-base font-nunito-bold text-gray-500">
								{index + 1}
							</Text>
							<Text
								className="min-w-0 flex-1 text-lg font-nunito text-gray-800"
								numberOfLines={1}
							>
								{item.name}
							</Text>
							<Text
								className={`text-base ${
									index === 0
										? "font-nunito-bold text-blue-600"
										: "font-nunito-semibold text-gray-700"
								}`}
							>
								{item.completedTasks}{" "}
								{item.completedTasks === 1 ? "tarea" : "tareas"}
							</Text>
						</View>
					))}
				</View>
			)}
		</View>
	);
}
