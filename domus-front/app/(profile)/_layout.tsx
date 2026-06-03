import { Stack } from "expo-router";
import React from "react";

export default function ProfileStackLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen name="task-preferences" />
			<Stack.Screen name="availability" />
		</Stack>
	);
}
