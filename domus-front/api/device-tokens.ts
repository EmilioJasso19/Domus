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
