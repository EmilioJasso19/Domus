import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useAuthStore } from "@/store/auth-store";
import { CircularProgress } from "@/components/circular-progress";
import { Task, tasks as mockTasks } from "@/mocks/mock-tasks";
import { Member, mockMembers } from "@/mocks/mock-members";
import { useEffect, useState } from "react";
import MemberCard from "@/components/member-card";
import TaskCard from "@/components/task-card";
import isTodayField from "@/utils/is-today-field";
import axios from "@/api/axios";
import { Toast } from "react-native-toast-message/lib/src/Toast";

export default function HomeScreen() {
	const { user } = useAuthStore();

	const [tasks, setTasks] = useState<Task[]>(mockTasks);
	const [members, setMembers] = useState<Member[]>(mockMembers);

	useEffect(() => {
		if (!user?.id) return;
		axios
			.get("/tasks/user/" + user?.id)
			.then((response) => {
				setTasks(response.data);
			})
			.catch((error) => {
				console.warn("Error fetching tasks for user", error);
				Toast.show({
					type: "error",
					text1: "Error al cargar las tareas",
					text2: error.response?.data?.message || "Ocurrió un error inesperado",
				});
			});
	}, [user]);

	const handleToggleOptimistic = (taskId: number) => {
		setTasks((prev) =>
			prev.map((task) =>
				task.id === taskId
					? { ...task, is_completed: !task.is_completed }
					: task,
			),
		);
	};

	return (
		<ScrollView className="flex-1 px-3 py-10 bg-slate-200">
			{/* HEADER */}
			<View className="flex-row justify-between items-center px-4 pt-14 pb-4">
				<View className="flex-row gap-2 items-center">
					<Ionicons name="document-text-outline" size={22} color="#2563EB" />
					<View className="flex-col">
						<Text className="text-sm text-gray-500">Bienvenido,</Text>
						<Text className="text-lg font-semibold text-gray-900">
							{user?.name} {user?.paternal_surname}
						</Text>
					</View>
				</View>
				<Pressable>
					<Ionicons name="notifications-outline" size={22} color="#2563EB" />
				</Pressable>
			</View>

			{/* STATS */}
			<View className="flex-col space-y-4 w-4/5 self-center bg-gray-100 rounded-lg">
				<Text className="text-lg font-semibold text-gray-500 mx-2 my-4 ml-4">
					Balance de tareas
				</Text>
				<View className="flex-row justify-around items-center overflow-hidden py-4">
					<View className="flex justify-center items-center self-start gap-4 px-4 py-2">
						<CircularProgress percentage={80} size={80} strokeWidth={8} />
						<Text className="absolute text-lg font-semibold text-blue-700">
							80%
						</Text>
					</View>
					<View className="flex-col gap-2">
						<Text className="text-lg font-bold text-gray-800">
							Vas muy bien!
						</Text>
						<Text className="text-sm text-gray-500 line-clamp-3 w-3/6 text-justify truncate">
							Las tareas han sido correctamente distribuidas. Buen trabajo!
						</Text>
					</View>
				</View>
			</View>

			{/* OTHER MEMBERS */}
			<View className="mt-8">
				<Text className="text-lg font-semibold text-gray-500 mx-2 my-4 ml-4">
					Miembros del hogar
				</Text>
				<View className="flex-row justify-around items-center px-4 py-2">
					{members.map((member) => (
						<MemberCard key={member.id} member={member} />
					))}
				</View>
			</View>
			{/* TODAY'S TASKS */}
			<View className="mt-8">
				<Text className="text-lg font-semibold text-gray-500 mx-2 my-4 ml-4">
					Tareas de hoy
				</Text>
				<View className="flex-col gap-4 px-4 py-2">
					{tasks
						.filter((task) => {
							return isTodayField(task, "due_date");
						})
						.map((task) => (
							<TaskCard key={task.id} task={task} onToggleOptimistic={handleToggleOptimistic} />
						))}
				</View>
			</View>
		</ScrollView>
	);
}
