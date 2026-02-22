import { useState } from "react";
import {
	View,
	Text,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	ScrollView,
	Image,
	Pressable,
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
				<Pressable
					className="bg-blue-600 rounded-lg h-14 flex items-center justify-center mt-2 shadow-md"
					onPress={handleSubmit}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text className="text-white font-bold text-base tracking-wider">Iniciar sesión</Text>
					)}
				</Pressable>

				{/* Register link */}
				<View className="flex-row justify-center items-center mt-6">
					<Text className="text-sm text-gray-500">¿No tienes una cuenta?</Text>
					<Pressable onPress={() => router.replace("/(auth)/register")}>
						<Text className="text-sm font-semibold text-blue-600 ml-1">Regístrate</Text>
					</Pressable>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>

		// TODO: Agregar botón de "Iniciar sesión con Google"
	);
}
