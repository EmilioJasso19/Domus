import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { mockReminders, Reminder, Task } from "@/mocks/mock-tasks";
import { useState } from "react";
import axios from "@/api/axios";
import Toast from "react-native-toast-message";

export default function TaskCard({
	task,
	onToggleOptimistic,
}: {
	task: Task;
	onToggleOptimistic: (id: number) => void;
}) {
	const [reminders, setReminders] = useState<Reminder[]>(mockReminders);

	const formatDateToHour = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	};

	const toggleTaskCompletion = () => {
		axios
			.patch(`/tasks/${task.id}/toggle-completion`)
			.then((response) => {
				// reload or update the task state here based on the response
                onToggleOptimistic(task.id);
				Toast.show({
					type: "success",
					text1: `Tarea ${task.id} marcada como ${task.is_completed ? "no completada" : "completada"}`,
				});
			})
			.catch((error) => {
				Toast.show({
					type: "error",
					text1: "Error al actualizar el estado de la tarea",
					text2: error.response?.data?.message || "Ocurrió un error inesperado",
				});
			});
	};
	return (
		<>
			<View className="flex-row justify-between items-center bg-white rounded-md px-2 py-3">
				<Pressable
					onPress={toggleTaskCompletion}
					className="flex-row justify-between items-center bg-white rounded-md px-4 py-3"
				>
					{task.is_completed ? (
						<Ionicons name="checkmark-circle" size={24} color="#16A34A" />
					) : (
						<Ionicons name="ellipse-outline" size={24} color="#9CA3AF" />
					)}
				</Pressable>
				<View className="flex-col flex-1 gap-2">
					<Text className="text-md font-semibold text-gray-800">
						{task.name}
					</Text>
					<View className="items-start justify-evenly gap-1">
						{task.reminder && (
							<View className="flex-row items-center gap-1">
								<Ionicons name="time-outline" size={16} color="#9CA3AF" />
								<Text className="text-xs text-gray-500">
									{formatDateToHour(
										reminders.find((r) => r.task_id === task.id)?.remind_at ||
											"",
									)}
								</Text>
							</View>
						)}
						<Text className="text-sm text-gray-500 truncate line-clamp-2">
							{task.description}
						</Text>
					</View>
				</View>
			</View>
		</>
	);
}
