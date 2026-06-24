import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerDeviceToken } from "@/api/device-tokens";

// Pide permiso de notificaciones (si hace falta), obtiene el Expo push token y
// lo registra en el backend. Si el usuario deniega el permiso o algo falla
// (p.ej. emulador sin push), simplemente se omite el registro: nunca lanza ni
// bloquea el arranque de la app.
export async function registerForPushNotificationsAsync(): Promise<void> {
	try {
		const { status: existing } = await Notifications.getPermissionsAsync();

		let status = existing;
		if (existing !== "granted") {
			// En iOS este request muestra el diálogo nativo de permisos.
			const requested = await Notifications.requestPermissionsAsync();
			status = requested.status;
		}

		if (status !== "granted") return; // permiso denegado: no registramos

		const token = await Notifications.getExpoPushTokenAsync();
		await registerDeviceToken(token.data, Platform.OS);
	} catch {
		// Silencioso a propósito: el registro de push no debe romper la app.
	}
}
