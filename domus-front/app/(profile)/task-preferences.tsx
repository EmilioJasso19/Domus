import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { TaskPreferenceRow } from "@/components/profile/task-preference-row";
import {
	INITIAL_TASK_PREFERENCES,
	type PreferenceValue,
} from "@/mocks/mock-task-preferences";
import { BACKGROUND, BLUE } from "@/constants/colors";

export default function TaskPreferencesScreen() {
	const router = useRouter();

	// Estado local: id de tarea → preferencia. El backend aún no expone este recurso.
	const [preferences, setPreferences] = useState<Record<string, PreferenceValue>>(
		() =>
			Object.fromEntries(
				INITIAL_TASK_PREFERENCES.map((task) => [task.id, task.value]),
			),
	);

	const handleChange = (taskId: string, next: PreferenceValue) =>
		setPreferences((prev) => ({ ...prev, [taskId]: next }));

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
				contentContainerClassName="px-5 pb-10 pt-4"
				showsVerticalScrollIndicator={false}
			>
				<Text className="mb-6 text-base font-nunito leading-6 text-gray-500">
					Estas preferencias ayudan a mejorar la asignación automática de tareas.
				</Text>

				<View className="gap-4">
					{INITIAL_TASK_PREFERENCES.map((task) => (
						<TaskPreferenceRow
							key={task.id}
							task={task}
							value={preferences[task.id]}
							onChange={(next) => handleChange(task.id, next)}
						/>
					))}
				</View>
			</ScrollView>
		</View>
	);
}
