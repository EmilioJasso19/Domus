import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";

import { passwordResetErrorMessage, requestPasswordReset } from "@/api/auth";
import InputField from "@/components/ui/input-field";
import { forgotPasswordSchema } from "@/store/auth-store";

export default function ForgotPasswordScreen() {
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [fieldError, setFieldError] = useState<string>();
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async () => {
		const result = forgotPasswordSchema.safeParse({ email });
		if (!result.success) {
			setFieldError(result.error.issues[0]?.message);
			return;
		}

		setIsLoading(true);
		setError(null);
		try {
			await requestPasswordReset(result.data.email);
			router.push({
				pathname: "/(auth)/reset-password",
				params: { email: result.data.email },
			});
		} catch (e) {
			setError(passwordResetErrorMessage(e));
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-slate-50"
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ flexGrow: 1 }}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Volver */}
				<View className="px-4 pt-14">
					<Pressable
						onPress={() => router.back()}
						className="w-11 h-11 items-center justify-center rounded-full active:bg-gray-100"
						accessibilityRole="button"
						accessibilityLabel="Volver"
					>
						<Ionicons name="arrow-back" size={24} color="#374151" />
					</Pressable>
				</View>

				{/* Header */}
				<View className="items-center pt-6 pb-8 px-6 gap-3">
					<View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center">
						<Ionicons name="key-outline" size={30} color="#3A63FA" />
					</View>
					<View className="items-center gap-1">
						<Text className="text-3xl font-nunito-extrabold text-gray-900 tracking-tight text-center">
							Recupera tu contraseña
						</Text>
						<Text className="text-sm font-nunito text-gray-500 text-center">
							Ingresa tu correo y te enviaremos un código de 6 dígitos.
						</Text>
					</View>
				</View>

				{/* Formulario */}
				<View className="flex-1 px-6 gap-1">
					{error && (
						<View className="flex-row items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
							<Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
							<Text className="text-sm font-nunito text-red-600 flex-1">{error}</Text>
						</View>
					)}

					<InputField
						label="Correo electrónico"
						icon="mail-outline"
						placeholder="tu@email.com"
						value={email}
						onChangeText={(v) => {
							setEmail(v);
							if (fieldError) setFieldError(undefined);
							if (error) setError(null);
						}}
						keyboardType="email-address"
						autoCapitalize="none"
						autoComplete="email"
						textContentType="emailAddress"
						returnKeyType="send"
						onSubmitEditing={handleSubmit}
						error={fieldError}
					/>
				</View>

				{/* CTA — zona inferior (thumb zone) */}
				<View className="px-6 pt-6 pb-10 gap-4">
					<Pressable
						className="bg-blue-600 rounded-2xl h-14 items-center justify-center shadow-sm active:bg-blue-700"
						onPress={handleSubmit}
						disabled={isLoading}
						accessibilityRole="button"
					>
						{isLoading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text className="text-white font-nunito-bold text-base tracking-wide">
								Enviar código
							</Text>
						)}
					</Pressable>

					<View className="flex-row justify-center items-center">
						<Text className="text-sm font-nunito text-gray-500">¿La recordaste?</Text>
						<Pressable onPress={() => router.replace("/(auth)/login")}>
							<Text className="text-sm font-nunito-semibold text-blue-600 ml-1">
								Inicia sesión
							</Text>
						</Pressable>
					</View>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
