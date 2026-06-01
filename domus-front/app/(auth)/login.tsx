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
			className="flex-1 bg-slate-50"
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ flexGrow: 1 }}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Header: logo + título + subtítulo */}
				<View className="items-center pt-20 pb-8 px-6 gap-3">
					<Image
						source={require("../../assets/images/domus-logo-ai.png")}
						className="w-20 h-20"
					/>
					<View className="items-center gap-1">
						<Text className="text-3xl font-nunito-extrabold text-gray-900 tracking-tight">
							Bienvenido de nuevo
						</Text>
						<Text className="text-sm font-nunito text-gray-500">
							Ingresa tus datos para continuar.
						</Text>
					</View>
				</View>

				{/* Formulario */}
				<View className="flex-1 px-6 gap-1">
					{/* Error global */}
					{error && (
						<View className="flex-row items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
							<Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
							<Text className="text-sm font-nunito text-red-600 flex-1">{error}</Text>
						</View>
					)}

					{/* Email */}
					<InputField
						label="Correo electrónico"
						icon="mail-outline"
						placeholder="tu@email.com"
						value={form.email}
						onChangeText={(v) => updateField("email", v)}
						keyboardType="email-address"
						autoCapitalize="none"
						autoComplete="email"
						error={errors.email}
					/>

					{/* Contraseña */}
					<InputField
						label="Contraseña"
						icon="lock-closed-outline"
						rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
						onRightIconPress={() => setShowPassword((p) => !p)}
						placeholder="••••••••"
						value={form.password}
						onChangeText={(v) => updateField("password", v)}
						secureTextEntry={!showPassword}
						autoCapitalize="none"
						error={errors.password}
					/>

				</View>

				{/* CTA + registro — zona inferior (thumb zone) */}
				<View className="px-6 pt-6 pb-10 gap-4">
					<Pressable
						className="bg-blue-600 rounded-2xl h-14 items-center justify-center shadow-sm active:bg-blue-700"
						onPress={handleSubmit}
						disabled={isLoading}
					>
						{isLoading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text className="text-white font-nunito-bold text-base tracking-wide">
								Iniciar sesión
							</Text>
						)}
					</Pressable>

					<View className="flex-row justify-center items-center">
						<Text className="text-sm font-nunito text-gray-500">¿No tienes cuenta?</Text>
						<Pressable onPress={() => router.replace("/(auth)/register")}>
							<Text className="text-sm font-nunito-semibold text-blue-600 ml-1">
								Registrarse
							</Text>
						</Pressable>
					</View>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}