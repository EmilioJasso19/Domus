import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { useAuthStore } from "@/store/auth-store";

export default function HomeScreen() {
  const {user} = useAuthStore();
	return (
		<View>
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

			{/* OTHER MEMBERS */}

			{/* TODAY'S TASKS */}
		</View>
	);
}
