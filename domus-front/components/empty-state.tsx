import { Text, View } from "react-native";

export function EmptyState({
    title,
    subtitle,
}: {
    title: string;
    subtitle: string;
}) {
    return (
        <View className="mt-6 items-center justify-center rounded-3xl bg-white px-8 py-10">
            <Text className="text-center text-lg font-nunito-bold text-gray-900">
                {title}
            </Text>
            <Text className="mt-2 text-center text-base font-nunito leading-6 text-gray-500">
                {subtitle}
            </Text>
        </View>
    );
}