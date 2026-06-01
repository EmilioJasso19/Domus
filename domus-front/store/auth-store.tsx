import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import axios from "../api/axios";
import { router } from "expo-router";
import { useHomeStore } from "./home-store";

// ===== Zod Schemas ====

export const registerSchema = z.object({
	name: z
		.string()
		.min(2, "El nombre debe tener al menos 2 caracteres")
		.max(50, "Nombre demasiado largo"),
	paternal_surname: z
		.string()
		.min(2, "El apellido debe tener al menos 2 caracteres")
		.max(50, "Apellido demasiado largo"),
	maternal_surname: z
		.string()
		.max(50, "Apellido demasiado largo")
		.optional()
		.or(z.literal("")),
	email: z.string().email("Correo electrónico inválido").toLowerCase(),
	password: z
		.string()
		.min(8, "La contraseña debe tener al menos 8 caracteres")
		.regex(/[A-Z]/, "Debe contener al menos una mayúscula")
		.regex(/[0-9]/, "Debe contener al menos un número"),
});

export const loginSchema = z.object({
	email: z.string().email("Correo electrónico inválido").toLowerCase(),
	password: z
		.string()
		.min(8, "La contraseña debe tener al menos 8 caracteres")
		.regex(/[A-Z]/, "Debe contener al menos una mayúscula")
		.regex(/[0-9]/, "Debe contener al menos un número")
		.regex(/^[^\s]+$/, "No debe contener espacios"),
});

export type RegisterForm = z.infer<typeof registerSchema>;
export type LoginForm = z.infer<typeof loginSchema>;

// ===== Store ====

interface AuthState {
	token: string | null;
	isHydrated: boolean;
	user: {
		id: string;
		email: string;
		name: string;
		paternal_surname: string;
		maternal_surname?: string;
	} | null;
	isLoading: boolean;
	error: string | null;

	loadToken: () => Promise<void>;
	login: (data: LoginForm) => Promise<void>;
	register: (data: RegisterForm) => Promise<void>;
	logout: () => Promise<void>;
	clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
	token: null,
	isHydrated: false,
	user: null,
	isLoading: false,
	error: null,

	loadToken: async () => {
		const [token, userRaw] = await Promise.all([
			SecureStore.getItemAsync("token"),
			AsyncStorage.getItem("user"),
		]);
		set({
			token,
			user: userRaw ? JSON.parse(userRaw) : null,
			isHydrated: true,
		});
		// Rehidratar hogares desde el home-store
		await useHomeStore.getState().loadHouseholds();
	},

	login: async (data) => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post("/auth/login", data);

			const { access_token, user, households } = response.data;
			await SecureStore.setItemAsync("token", access_token);
			await AsyncStorage.setItem("user", JSON.stringify(user));
			set({ token: access_token, user });

			// Delegar la responsabilidad de hogares al home-store
			await useHomeStore.getState().setHouseholds(households ?? []);
		} catch (e: any) {
			let message = "Algo salió mal. Inténtalo de nuevo.";

			switch (e.status) {
				case 400:
					message = "Revisa los datos ingresados.";
					break;
				case 401:
					message = "Correo o contraseña incorrectos.";
					break;
				case 429:
					message = "Demasiados intentos. Espera un momento.";
					break;
				case 500:
				case 502:
				case 503:
					message = "Error del servidor. Inténtalo más tarde.";
					break;
			}

			set({ error: message });
		} finally {
			set({ isLoading: false });
		}
	},

	register: async (data) => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post("/auth/register", data);

			if (response.status !== 201) {
				const err = await response.data;
				set({ error: err.message || "Error al registrar" });
				throw new Error(err.message || "Error al registrar");
			}

			const { access_token: token, user } = await response.data;
			await SecureStore.setItemAsync("token", token);
			await AsyncStorage.setItem("user", JSON.stringify(user));
			set({ token, user });

			// Un usuario recién registrado no tiene hogares todavía
			await useHomeStore.getState().setHouseholds([]);
		} catch (e: any) {
			set({ error: e.message });
		} finally {
			set({ isLoading: false });
		}
	},

	logout: async () => {
		await SecureStore.deleteItemAsync("token");
		await AsyncStorage.removeItem("user");
		set({ token: null, user: null });

		// Limpiar también los hogares
		await useHomeStore.getState().clearHouseholds();

		router.push("(auth)/login");
	},

	clearError: () => set({ error: null }),
}));