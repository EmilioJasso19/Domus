import Axios from 'axios'
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/';

const axios = Axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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
            console.log("Token inválido o expirado, redirigiendo al login")
            SecureStore.deleteItemAsync('token');
            router.push('(auth)/login');
        }
        
        if (error.response?.status === 419) {
            console.log("Token expirado, redirigiendo al login")
            SecureStore.deleteItemAsync('token');
            router.push('(auth)/login');
        }
        
        return Promise.reject(error)
    }
)


export default axios;