import Axios from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import { useAuthStore } from '@/store/auth-store';
// import { getLocalTimeZone } from '@/utils';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/';

const axios = Axios.create({
	baseURL: API_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

axios.interceptors.request.use(async (config) => {
	const token = await SecureStore.getItemAsync('token');
	if (token) {
		config.headers['Authorization'] = `Bearer ${token}`;
		// config.headers['X-Timezone'] = getLocalTimeZone();
	}
	return config;
});

// Rutas que nunca deben disparar un intento de refresh en su propio 401: los
// endpoints de auth (para no reintentar un login fallido) y refresh/logout
// (para no entrar en bucle si el propio refresh o el propio logout fallan).
const AUTH_ENDPOINTS_WITHOUT_RETRY = [
	'/auth/login',
	'/auth/register',
	'/auth/refresh',
	'/auth/logout',
];

// Single-flight: si varias peticiones expiran casi al mismo tiempo (p.ej. al
// reabrir la app), todas comparten el mismo intento de refresh en vez de
// disparar cada una el suyo. El refresh token rota en el backend — dos
// llamadas a /auth/refresh con el mismo token harían que la segunda falle y
// cierre la sesión de un usuario con sesión en realidad válida.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
	const storedRefreshToken = await SecureStore.getItemAsync('refresh_token');
	if (!storedRefreshToken) return null;

	try {
		const response = await Axios.post(`${API_URL}auth/refresh`, {
			refresh_token: storedRefreshToken,
		});
		const { access_token, refresh_token } = response.data;
		await SecureStore.setItemAsync('token', access_token);
		await SecureStore.setItemAsync('refresh_token', refresh_token);
		return access_token;
	} catch {
		return null;
	}
}

axios.interceptors.response.use(
	(response) => response,
	async (error) => {
		const status = error.response?.status;
		const config = error.config ?? {};
		const url = config.url ?? '';

		const isExemptEndpoint = AUTH_ENDPOINTS_WITHOUT_RETRY.some((path) =>
			url.includes(path)
		);

		if ((status === 401 || status === 419) && !isExemptEndpoint && !config._retry) {
			config._retry = true;

			if (!refreshPromise) {
				refreshPromise = refreshAccessToken().finally(() => {
					refreshPromise = null;
				});
			}

			const newAccessToken = await refreshPromise;

			if (newAccessToken) {
				config.headers['Authorization'] = `Bearer ${newAccessToken}`;
				return axios(config);
			}

			// No había refresh token, o el refresh también falló: la sesión
			// terminó de verdad.
			await SecureStore.deleteItemAsync('token');
			await SecureStore.deleteItemAsync('refresh_token');
			const logout = useAuthStore.getState().logout;
			await logout();
			router.replace('/(auth)/login');
		}

		return Promise.reject(error);
	}
);

export default axios;