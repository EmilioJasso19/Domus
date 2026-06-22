import { View, Text, Pressable } from "react-native";
import { Check, Clock, Repeat } from "lucide-react-native";
import type { TaskFrequency } from "@/api/tasks";

const BLUE = "#3A63FA";

// Soft avatar palette shared by the responsible chips. Index is derived from
// the member position so each member keeps a stable color across cards.
const AVATAR_COLORS = [
	{ background: "#E0E7FF", text: "#1E3A8A" },
	{ background: "#FEE2E2", text: "#7F1D1D" },
	{ background: "#DCFCE7", text: "#14532D" },
	{ background: "#FEF3C7", text: "#78350F" },
	{ background: "#F3E8FF", text: "#581C87" },
];

const FREQUENCY_LABELS: Record<TaskFrequency, string> = {
	once: "Una vez",
	daily: "Diario",
	weekly: "Semanal",
	monthly: "Mensual",
};

const cardShadow = {
	shadowColor: "#111827",
	shadowOffset: { width: 0, height: 3 },
	shadowOpacity: 0.04,
	shadowRadius: 10,
	elevation: 1,
};

export type TaskCardModel = {
	id: string;
	name: string;
	frequency: TaskFrequency;
	isCompleted: boolean;
	responsibleName?: string | null;
	responsibleInitials?: string | null;
	responsibleColorIndex?: number;
	dateBadge: string;
};

type TaskCardProps = {
	task: TaskCardModel;
	onToggle: (id: string) => void;
	onPress?: (id: string) => void;
};

export function TaskCard({ task, onToggle, onPress }: TaskCardProps) {
	const palette =
		AVATAR_COLORS[(task.responsibleColorIndex ?? 0) % AVATAR_COLORS.length];

	return (
		<View
			className="flex-row items-start gap-3 rounded-3xl bg-white px-4 py-4"
			style={cardShadow}
		>
			<Pressable
				onPress={() => onToggle(task.id)}
				hitSlop={10}
				accessibilityRole="checkbox"
				accessibilityState={{ checked: task.isCompleted }}
				accessibilityLabel={`Marcar "${task.name}" como ${
					task.isCompleted ? "pendiente" : "completada"
				}`}
				className={`mt-0.5 h-6 w-6 items-center justify-center rounded-lg border-2 ${
					task.isCompleted ? "border-blue-600 bg-blue-600" : "border-gray-300"
				}`}
			>
				{task.isCompleted ? <Check size={16} color="#fff" strokeWidth={3} /> : null}
			</Pressable>

			<Pressable
				onPress={onPress ? () => onPress(task.id) : undefined}
				disabled={!onPress}
				accessibilityRole={onPress ? "button" : undefined}
				accessibilityLabel={onPress ? `Ver detalle de "${task.name}"` : undefined}
				className="min-w-0 flex-1 flex-row items-start gap-3"
			>
				<View className="min-w-0 flex-1">
					<Text
						className={`text-base font-nunito-semibold ${
							task.isCompleted
								? "text-gray-400 line-through"
								: "text-gray-900"
						}`}
					>
						{task.name}
					</Text>

					<View className="mt-2 flex-row flex-wrap items-center gap-2">
						{task.responsibleName ? (
							<View className="flex-row items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-1 pr-2.5">
								<View
									className="h-5 w-5 items-center justify-center rounded-full"
									style={{ backgroundColor: palette.background }}
								>
									<Text
										className="text-[10px] font-nunito-bold"
										style={{ color: palette.text }}
									>
										{task.responsibleInitials}
									</Text>
								</View>
								<Text
									className="text-xs font-nunito-semibold text-gray-700"
									numberOfLines={1}
								>
									{task.responsibleName}
								</Text>
							</View>
						) : null}

						<View className="flex-row items-center gap-1">
							<Repeat size={13} color="#9CA3AF" />
							<Text className="text-xs font-nunito-medium text-gray-500">
								{FREQUENCY_LABELS[task.frequency]}
							</Text>
						</View>
					</View>
				</View>

				<View className="flex-row items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1.5">
					<Clock size={13} color="#6B7280" />
					<Text className="text-xs font-nunito-semibold text-gray-600">
						{task.dateBadge}
					</Text>
				</View>
			</Pressable>
		</View>
	);
}

export { BLUE as TASK_ACCENT };
