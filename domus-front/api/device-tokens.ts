import axios from "@/api/axios";

// Registra (o reasigna) el token de push del dispositivo del usuario autenticado.
// El JWT lo adjunta el interceptor de axios.
export async function registerDeviceToken(
	expoPushToken: string,
	platform: string,
): Promise<void> {
	await axios.post("/device-tokens", {
		expo_push_token: expoPushToken,
		platform,
	});
}

// Borra el token de este dispositivo (p.ej. al cerrar sesión). El token de Expo
// contiene corchetes, así que se codifica para el path param.
export async function unregisterDeviceToken(
	expoPushToken: string,
): Promise<void> {
	await axios.delete(`/device-tokens/${encodeURIComponent(expoPushToken)}`);
}
