import { View, Text } from "react-native";
import { Member } from "@/mocks/mock-members";

export default function MemberCard({ member }: { member: Member }) {
	return (
		<View
			className="flex-col items-center justify-center bg-white rounded-md px-8 py-6"
		>
			<View className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
				<Text className="text-white font-bold">
					{member.paternal_surname.charAt(0)}
				</Text>
			</View>
			<Text className="text-sm text-gray-700 mt-1">{member.name}</Text>
		</View>
	);
}
