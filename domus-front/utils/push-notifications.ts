import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
	registerDeviceToken,
	unregisterDeviceToken,
} from "@/api/device-tokens";

// El projectId de EAS es obligatorio para getExpoPushTokenAsync en builds
// standalone; sin él la obtención del token falla en producción.
const projectId =
	Constants.expoConfig?.extra?.eas?.projectId ??
	(Constants as any).easConfig?.projectId;

// Último token ya sincronizado con el backend. Hace idempotente el registro:
// aunque se llame varias veces (re-render, re-login), solo hace POST cuando el
// token cambia realmente. Se resetea al cerrar sesión.
let lastRegisteredToken: string | null = null;

// Pide permiso (si hace falta), obtiene el Expo push token del dispositivo
// ACTUAL y lo sincroniza con el backend. Devuelve el token, o null si no se pudo
// (permiso denegado, emulador sin Google Play, projectId ausente, etc.).
export async function registerForPushNotificationsAsync(): Promise<
	string | null
> {
	try {
		const { status: existing } = await Notifications.getPermissionsAsync();

		let status = existing;
		if (existing !== "granted") {
			// En iOS este request muestra el diálogo nativo de permisos.
			const requested = await Notifications.requestPermissionsAsync();
			status = requested.status;
		}

		if (status !== "granted") {
			console.warn("[push] permiso de notificaciones no concedido:", status);
			return null;
		}

		const token = await Notifications.getExpoPushTokenAsync({ projectId });

		// Ya está registrado este token: no repetimos el POST (evita el spam).
		if (token.data === lastRegisteredToken) return token.data;

		await registerDeviceToken(token.data, Platform.OS);
		lastRegisteredToken = token.data;
		return token.data;
	} catch (err) {
		// Ya NO es silencioso: sin logs es imposible saber por qué un dispositivo
		// nunca queda registrado (projectId faltante, emulador sin push, etc.).
		console.error("[push] no se pudo registrar el token de push:", err);
		return null;
	}
}

// Al cerrar sesión: borra del backend el token de ESTE dispositivo para que el
// usuario que sale deje de recibir notificaciones aquí, y limpia el guard para
// que el próximo usuario que inicie sesión vuelva a registrarlo (reasignación).
// Debe llamarse ANTES de borrar el JWT, porque la petición va autenticada.
export async function unregisterForPushNotificationsAsync(): Promise<void> {
	try {
		const token = await Notifications.getExpoPushTokenAsync({ projectId });
		await unregisterDeviceToken(token.data);
	} catch (err) {
		console.error("[push] no se pudo desregistrar el token de push:", err);
	} finally {
		lastRegisteredToken = null;
	}
}
