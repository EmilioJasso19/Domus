import Axios from 'axios'
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from "@/store/auth-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/';

const axios = Axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// interceptor para manejar errores globales (como token expirado)
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const logout = useAuthStore.getState().logout;
      await logout();
    }
    return Promise.reject(error);
  }
);

// Interceptor para agregar el token a cada solicitud
axios.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    }
);

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            SecureStore.deleteItemAsync('token');
            router.push('(auth)/login');
        }
        
        if (error.response?.status === 419) {
            SecureStore.deleteItemAsync('token');
            router.push('(auth)/login');
        }
        
        return Promise.reject(error)
    }
)


export default axios;