import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, registerSchema, type RegisterForm } from '../../store/auth-store';
import InputField from '../../components/ui/input-field';

type FormErrors = Partial<Record<keyof RegisterForm, string>>;

// ── Cálculo de fuerza de contraseña ─────────────────────────────────────────
// Devuelve un score de 0 a 4 según las reglas que valida el backend
// (longitud, minúscula, mayúscula, número, símbolo).
function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0–4
}

const STRENGTH_CONFIG = [
  { label: '', color: '#E5E7EB', bars: 0 },
  { label: 'Débil', color: '#EF4444', bars: 1 },
  { label: 'Regular', color: '#F59E0B', bars: 2 },
  { label: 'Buena', color: '#3B82F6', bars: 3 },
  { label: 'Fuerte', color: '#22C55E', bars: 4 },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [form, setForm] = useState<RegisterForm>({
    name: '',
    paternal_surname: '',
    maternal_surname: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const strengthInfo = STRENGTH_CONFIG[strength];

  const updateField = (field: keyof RegisterForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (error) clearError();
  };

  const handleSubmit = async () => {
    const result = registerSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((e) => {
        const field = e.path[0] as keyof RegisterForm;
        fieldErrors[field] = e.message;
      });
      fieldErrors.password = fieldErrors.password + `${process.env.EXPO_PUBLIC_API_URL}`;
      setErrors(fieldErrors);
      return;
    }

    await register(result.data);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4">
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          className="w-9 h-9 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color="#2563EB" />
        </TouchableOpacity>
        <Text className="text-[17px] font-nunito-bold text-blue-600 tracking-tight">
          Domus
        </Text>
        <View className="w-9 h-9" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-12"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View className="mb-7">
          <Text className="text-[28px] font-nunito-extrabold text-gray-900 tracking-tight mb-1">
            Crear cuenta
          </Text>
          <Text className="text-md font-nunito text-gray-500">
            Únete a Domus para organizar tu hogar.
          </Text>
        </View>

        {/* Global error */}
        {error && (
          <View className="flex-row items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text className="text-[13px] font-nunito text-red-600 flex-1">{error}</Text>
          </View>
        )}

        {/* Nombre */}
        <InputField
          label="Nombre"
          placeholder="Ej. Juan"
          value={form.name}
          onChangeText={(v) => updateField('name', v)}
          autoCapitalize="words"
          error={errors.name}
        />

        {/* Apellido paterno */}
        <InputField
          label="Apellido paterno"
          placeholder="Ej. Pérez"
          value={form.paternal_surname}
          onChangeText={(v) => updateField('paternal_surname', v)}
          autoCapitalize="words"
          error={errors.paternal_surname}
        />

        {/* Apellido materno (opcional) */}
        <InputField
          label="Apellido materno"
          labelSuffix="(opcional)"
          placeholder="Ej. García"
          value={form.maternal_surname}
          onChangeText={(v) => updateField('maternal_surname', v)}
          autoCapitalize="words"
          error={errors.maternal_surname}
        />

        {/* Correo electrónico */}
        <InputField
          label="Correo electrónico"
          icon="mail-outline"
          placeholder="tu@email.com"
          value={form.email}
          onChangeText={(v) => updateField('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={errors.email}
        />

        {/* Contraseña */}
        <InputField
          label="Contraseña"
          icon="lock-closed-outline"
          rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowPassword((p) => !p)}
          placeholder="Mínimo 8 caracteres"
          value={form.password}
          onChangeText={(v) => updateField('password', v)}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          error={errors.password}
        />

        {/* Indicador de fuerza de contraseña */}
        {form.password.length > 0 && (
          <View className="mt-1 mb-2">
            <View className="flex-row gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  className="flex-1 h-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      i < strengthInfo.bars ? strengthInfo.color : '#E5E7EB',
                  }}
                />
              ))}
            </View>
            <Text className="text-[12px] font-nunito text-gray-400 mt-1.5">
              Usa al menos 8 caracteres, números y símbolos.
            </Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          className={`bg-blue-600 rounded-2xl h-14 items-center justify-center mt-6 shadow-lg shadow-blue-600/30 ${isLoading ? 'opacity-70' : ''}`}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-nunito-bold tracking-wide">
              Continuar
            </Text>
          )}
        </TouchableOpacity>

        {/* Login link */}
        <View className="flex-row justify-center items-center mt-6">
          <Text className="text-sm font-nunito text-gray-500">¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text className="text-sm font-nunito-semibold text-blue-600">Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}