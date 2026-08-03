import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
	registerDeviceToken,
	unregisterDeviceToken,
} from "@/api/device-tokens";
import { getDeviceId } from "@/utils/device-id";

// El projectId de EAS es obligatorio para getExpoPushTokenAsync en builds
// standalone; sin él la obtención del token falla en producción.
const projectId =
	Constants.expoConfig?.extra?.eas?.projectId ??
	(Constants as any).easConfig?.projectId;

// Sin handler, expo-notifications RECIBE las notificaciones en primer plano pero
// no las presenta: no hay banner, ni sonido, ni nada. Es la razón por la que los
// avisos que se prueban con la app abierta parecían no llegar.
//
// Va a nivel de módulo (no dentro de una función) para que quede instalado en
// cuanto se importa el módulo, antes de que pueda entrar ninguna notificación.
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		// En Android, shouldPlaySound: false suprime también el banner desplegable,
		// sea cual sea la prioridad del canal.
		shouldPlaySound: true,
		shouldSetBadge: false,
	}),
});

// Los ids deben coincidir con los channelId que envía el backend:
// 'home' (home.service.ts), 'tasks' (task-occurrences.service.ts) y
// 'reminders' (reminders.service.ts).
const ANDROID_CHANNELS = [
	{ id: "home", name: "Hogar" },
	{ id: "tasks", name: "Tareas" },
	{ id: "reminders", name: "Recordatorios" },
] as const;

/**
 * Crea los canales de notificación de Android.
 *
 * En Android 8+ toda notificación va por un canal. Si el push llega con un
 * channelId que la app no ha creado, el sistema puede descartarlo sin mostrar
 * nada. Crear un canal es idempotente: repetirlo no duplica ni resetea las
 * preferencias que el usuario haya cambiado a mano.
 */
export async function ensureAndroidChannelsAsync(): Promise<void> {
	if (Platform.OS !== "android") return;

	await Promise.all(
		ANDROID_CHANNELS.map(({ id, name }) =>
			Notifications.setNotificationChannelAsync(id, {
				name,
				importance: Notifications.AndroidImportance.HIGH,
				sound: "default",
				vibrationPattern: [0, 250, 250, 250],
			}),
		),
	);
}

// Último token sincronizado con el backend y cuándo. Hacen idempotente el
// registro: se repite el POST solo si el token cambió o si hace bastante que no
// se reporta. Sin la parte temporal, el latido de AppState nunca refrescaría
// last_seen_at porque el token casi nunca cambia. Se resetean al cerrar sesión.
let lastRegisteredToken: string | null = null;
let lastRegisteredAt = 0;

const HEARTBEAT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 h

// Pide permiso (si hace falta), obtiene el Expo push token del dispositivo
// ACTUAL y lo sincroniza con el backend. Devuelve el token, o null si no se pudo
// (permiso denegado, emulador sin Google Play, projectId ausente, etc.).
export async function registerForPushNotificationsAsync(): Promise<
	string | null
> {
	try {
		// Antes de pedir el token: si llega un push antes de que exista el canal,
		// Android puede descartarlo.
		await ensureAndroidChannelsAsync();

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

		// Mismo token y reportado hace poco: no repetimos el POST (evita el spam).
		const isFresh = Date.now() - lastRegisteredAt < HEARTBEAT_INTERVAL_MS;
		if (token.data === lastRegisteredToken && isFresh) return token.data;

		await registerDeviceToken(await getDeviceId(), token.data, Platform.OS);
		lastRegisteredToken = token.data;
		lastRegisteredAt = Date.now();
		return token.data;
	} catch (err) {
		// Ya NO es silencioso: sin logs es imposible saber por qué un dispositivo
		// nunca queda registrado (projectId faltante, emulador sin push, etc.).
		console.error("[push] no se pudo registrar el token de push:", err);
		return null;
	}
}

// Al cerrar sesión: borra del backend el token de ESTE dispositivo para que el
// usuario que sale deje de recibir notificaciones aquí, y limpia los guards para
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
		lastRegisteredAt = 0;
	}
}
