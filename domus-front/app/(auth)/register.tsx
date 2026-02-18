import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, registerSchema, type RegisterForm } from '../../store/auth-store';
import InputField from '../../components/ui/input-field';

type FormErrors = Partial<Record<keyof RegisterForm, string>>;

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
      setErrors(fieldErrors);
      return;
    }

    await register(result.data);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4">
        <TouchableOpacity
          onPress={() => router.push('(auth)/login')}
          className="w-9 h-9 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color="#2563EB" />
        </TouchableOpacity>
        <Text className="text-[17px] font-semibold text-gray-900 tracking-tight">
          Create Account
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
          <Text className="text-[28px] font-bold text-gray-900 tracking-tight mb-1">
            Únete a Domus
          </Text>
          <Text className="text-md text-gray-500">
            Crea tu cuenta y organiza tu hogar facilmente
          </Text>
        </View>

        {/* Global error */}
        {error && (
          <View className="flex-row items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text className="text-[13px] text-red-600 flex-1">{error}</Text>
          </View>
        )}

        {/* First Name */}
        <InputField
          label="First Name"
          placeholder="e.g. Alex"
          value={form.name}
          onChangeText={(v) => updateField('name', v)}
          autoCapitalize="words"
          error={errors.name}
        />

        {/* Paternal Last Name */}
        <InputField
          label="Paternal Last Name"
          placeholder="Enter last name"
          value={form.paternal_surname}
          onChangeText={(v) => updateField('paternal_surname', v)}
          autoCapitalize="words"
          error={errors.paternal_surname}
        />

        {/* Maternal Last Name */}
        <InputField
          label="Maternal Last Name"
          labelSuffix="(Optional)"
          placeholder="Enter optional last name"
          value={form.maternal_surname}
          onChangeText={(v) => updateField('maternal_surname', v)}
          autoCapitalize="words"
          error={errors.maternal_surname}
        />

        {/* Email */}
        <InputField
          label="Email Address"
          icon="mail-outline"
          placeholder="alex@example.com"
          value={form.email}
          onChangeText={(v) => updateField('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={errors.email}
        />

        {/* Password */}
        <InputField
          label="Password"
          icon="lock-closed-outline"
          rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowPassword((p) => !p)}
          placeholder="Create a password"
          value={form.password}
          onChangeText={(v) => updateField('password', v)}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          error={errors.password}
        />

        {/* Submit */}
        <TouchableOpacity
          className={`bg-blue-600 rounded-2xl h-14 items-center justify-center mt-2 shadow-lg shadow-blue-600/30 ${isLoading ? 'opacity-70' : ''}`}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-bold tracking-wide">
              Register Account
            </Text>
          )}
        </TouchableOpacity>

        {/* Login link */}
        <View className="flex-row justify-center items-center mt-6">
          <Text className="text-sm text-gray-500">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text className="text-sm font-semibold text-blue-600">Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}