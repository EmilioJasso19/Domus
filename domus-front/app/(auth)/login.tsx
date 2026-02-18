import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	ScrollView,
	Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
	useAuthStore,
	loginSchema,
	type LoginForm,
} from "../../store/auth-store";
import InputField from "@/components/ui/input-field";

type FormErrors = Partial<Record<keyof LoginForm, string>>;

export default function LoginScreen() {
	const router = useRouter();
	const { login, isLoading, error, clearError } = useAuthStore();

	const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
	const [errors, setErrors] = useState<FormErrors>({});
	const [showPassword, setShowPassword] = useState(false);

	const updateField = (field: keyof LoginForm, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
		if (error) clearError();
	};

	const handleSubmit = async () => {
		const result = loginSchema.safeParse(form);

		if (!result.success) {
			const fieldErrors: FormErrors = {};
			result.error.issues.forEach((e) => {
				const field = e.path[0] as keyof LoginForm;
				fieldErrors[field] = e.message;
			});
			setErrors(fieldErrors);
			return;
		}

		await login(result.data);
	};

	return (
		<KeyboardAvoidingView
			className="flex flex-col min-h-screen bg-white"
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			{/* Header */}
			<View className="flex flex-col items-center justify-center pt-28 pb-8 gap-2">
				<Image
					source={require("../../assets/images/domus-logo-ai.png")}
					className="w-24 h-24"
				/>
				<Text className="text-3xl font-extrabold">Domus</Text>
				<Text className="text-md font-semibold text-gray-500">
					Organiza tu hogar con facilidad
				</Text>
			</View>

			<ScrollView
				className="px-6 pb-12"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Global error */}
				{error && (
					<View className="flex flex-row items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
						<Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
						<Text className="text-sm text-red-600">{error}</Text>
					</View>
				)}

				{/* Email */}
				<InputField
					label="Correo electrónico"
					icon="mail-outline"
					placeholder="user@ejemplo.com"
					value={form.email}
					onChangeText={(v) => updateField("email", v)}
					keyboardType="email-address"
					autoCapitalize="none"
					autoComplete="email"
					error={errors.email}
				/>

				{/* Password */}
				<InputField
					label="Contraseña"
					icon="lock-closed-outline"
					rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
					onRightIconPress={() => setShowPassword((p) => !p)}
					placeholder="Crea una contraseña"
					value={form.password}
					onChangeText={(v) => updateField("password", v)}
					secureTextEntry={!showPassword}
					autoCapitalize="none"
					error={errors.password}
				/>

				{/* Submit */}
				<TouchableOpacity
					style={[styles.btn, isLoading && styles.btnDisabled]}
					onPress={handleSubmit}
					disabled={isLoading}
					activeOpacity={0.85}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.btnText}>Iniciar sesión</Text>
					)}
				</TouchableOpacity>

				{/* Register link */}
				<View style={styles.registerRow}>
					<Text style={styles.registerText}>¿No tienes una cuenta? </Text>
					<TouchableOpacity onPress={() => router.replace("/(auth)/register")}>
						<Text style={styles.registerLink}>Regístrate</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>

		// TODO: Agregar botón de "Iniciar sesión con Google"
	);
}

const styles = StyleSheet.create({
	globalErrorText: {
		fontSize: 13,
		color: "#DC2626",
		flex: 1,
	},
	btn: {
		backgroundColor: "#2563EB",
		borderRadius: 14,
		height: 54,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 8,
		shadowColor: "#2563EB",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 6,
	},
	btnDisabled: {
		opacity: 0.7,
	},
	btnText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "700",
		letterSpacing: 0.2,
	},

	registerRow: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		marginTop: 24,
	},
	registerText: {
		fontSize: 14,
		color: "#6B7280",
	},
	registerLink: {
		fontSize: 14,
		fontWeight: "600",
		color: "#2563EB",
	},
});
