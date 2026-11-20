import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import Toast from "react-native-toast-message";

import {
	passwordResetErrorMessage,
	requestPasswordReset,
	resetPassword,
} from "@/api/auth";
import InputField from "@/components/ui/input-field";
import { type ResetPasswordForm, resetPasswordSchema } from "@/store/auth-store";

type FormErrors = Partial<Record<keyof ResetPasswordForm, string>>;

// Igual al enfriamiento por cuenta del backend: antes de eso no se reenvía.
const RESEND_COOLDOWN_SECONDS = 60;

export default function ResetPasswordScreen() {
	const router = useRouter();
	const { email } = useLocalSearchParams<{ email: string }>();

	const [form, setForm] = useState<ResetPasswordForm>({
		code: "",
		new_password: "",
		confirm_password: "",
	});
	const [errors, setErrors] = useState<FormErrors>({});
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
	const [isResending, setIsResending] = useState(false);

	// Sin correo (p.ej. se abrió la ruta directo) no hay nada que restablecer.
	useEffect(() => {
		if (!email) router.replace("/(auth)/forgot-password");
	}, [email, router]);

	useEffect(() => {
		if (cooldown <= 0) return;
		const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
		return () => clearTimeout(timer);
	}, [cooldown]);

	const updateField = (field: keyof ResetPasswordForm, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
		if (error) setError(null);
	};

	const handleSubmit = async () => {
		const result = resetPasswordSchema.safeParse(form);

		if (!result.success) {
			const fieldErrors: FormErrors = {};
			result.error.issues.forEach((e) => {
				const field = e.path[0] as keyof ResetPasswordForm;
				if (!fieldErrors[field]) fieldErrors[field] = e.message;
			});
			setErrors(fieldErrors);
			return;
		}

		setIsLoading(true);
		setError(null);
		try {
			await resetPassword({
				email,
				code: result.data.code,
				new_password: result.data.new_password,
			});
			Toast.show({
				type: "success",
				text1: "Contraseña actualizada",
				text2: "Inicia sesión con tu nueva contraseña.",
			});
			router.replace("/(auth)/login");
		} catch (e) {
			setError(passwordResetErrorMessage(e));
		} finally {
			setIsLoading(false);
		}
	};

	const handleResend = async () => {
		if (cooldown > 0 || isResending) return;
		setIsResending(true);
		setError(null);
		try {
			await requestPasswordReset(email);
			setCooldown(RESEND_COOLDOWN_SECONDS);
			updateField("code", "");
			Toast.show({ type: "success", text1: "Te enviamos un código nuevo" });
		} catch (e) {
			setError(passwordResetErrorMessage(e));
		} finally {
			setIsResending(false);
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
						<Ionicons name="mail-open-outline" size={30} color="#3A63FA" />
					</View>
					<View className="items-center gap-1">
						<Text className="text-3xl font-nunito-extrabold text-gray-900 tracking-tight text-center">
							Revisa tu correo
						</Text>
						<Text className="text-sm font-nunito text-gray-500 text-center">
							Si hay una cuenta con{" "}
							<Text className="font-nunito-semibold text-gray-700">{email}</Text>, te
							enviamos un código de 6 dígitos. Expira en 15 minutos.
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
						label="Código"
						icon="keypad-outline"
						placeholder="123456"
						value={form.code}
						onChangeText={(v) => updateField("code", v.replace(/\D/g, ""))}
						keyboardType="number-pad"
						maxLength={6}
						textContentType="oneTimeCode"
						autoComplete="one-time-code"
						error={errors.code}
					/>

					<InputField
						label="Nueva contraseña"
						icon="lock-closed-outline"
						rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
						onRightIconPress={() => setShowPassword((p) => !p)}
						placeholder="••••••••"
						value={form.new_password}
						onChangeText={(v) => updateField("new_password", v)}
						secureTextEntry={!showPassword}
						autoCapitalize="none"
						autoComplete="new-password"
						textContentType="newPassword"
						error={errors.new_password}
					/>

					<InputField
						label="Confirmar contraseña"
						icon="lock-closed-outline"
						placeholder="••••••••"
						value={form.confirm_password}
						onChangeText={(v) => updateField("confirm_password", v)}
						secureTextEntry={!showPassword}
						autoCapitalize="none"
						autoComplete="new-password"
						textContentType="newPassword"
						error={errors.confirm_password}
					/>

					<Text className="text-xs font-nunito text-gray-500">
						Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.
					</Text>
				</View>

				{/* CTA + reenviar — zona inferior (thumb zone) */}
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
								Cambiar contraseña
							</Text>
						)}
					</Pressable>

					<View className="flex-row justify-center items-center">
						<Text className="text-sm font-nunito text-gray-500">¿No te llegó?</Text>
						<Pressable
							onPress={handleResend}
							disabled={cooldown > 0 || isResending}
							accessibilityRole="button"
							accessibilityState={{ disabled: cooldown > 0 || isResending }}
						>
							<Text
								className={`text-sm font-nunito-semibold ml-1 ${
									cooldown > 0 || isResending ? "text-gray-400" : "text-blue-600"
								}`}
							>
								{cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
							</Text>
						</Pressable>
					</View>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
