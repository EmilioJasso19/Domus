import { View, Text } from "react-native";

export function SectionEmpty({ message }: { message: string }) {
	return (
		<View className="rounded-2xl bg-white px-4 py-5">
			<Text className="text-center text-sm font-nunito text-gray-400">
				{message}
			</Text>
		</View>
	);
}