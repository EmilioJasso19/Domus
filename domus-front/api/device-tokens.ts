import axios from "@/api/axios";

// Alta o latido del dispositivo del usuario autenticado: el backend identifica
// el registro por (usuario, device_id), así que un token nuevo actualiza la fila
// existente en vez de crear una duplicada. El JWT lo adjunta el interceptor.
export async function registerDeviceToken(
	deviceId: string,
	expoPushToken: string,
	platform: string,
): Promise<void> {
	await axios.post("/device-tokens", {
		device_id: deviceId,
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
