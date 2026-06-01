import Axios from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/auth-store';

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
	}
	return config;
});

axios.interceptors.response.use(
	(response) => response,
	async (error) => {
		const status = error.response?.status;
		const url = error.config?.url ?? '';

		const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

		if ((status === 401 || status === 419) && !isAuthEndpoint) {
			await SecureStore.deleteItemAsync('token');
			const logout = useAuthStore.getState().logout;
			await logout();
			router.replace('/(auth)/login');
		}

		return Promise.reject(error);
	}
);

export default axios;