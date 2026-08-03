import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_DEVICE_ID = "deviceId";

// Cache en memoria para no ir a AsyncStorage en cada latido.
let cachedDeviceId: string | null = null;
// Vuelo en curso: si dos llamadas coinciden antes de que la primera termine,
// ambas esperan a la misma promesa en vez de generar dos ids distintos.
let inFlight: Promise<string> | null = null;

// UUID v4 con Math.random. No hace falta fuerza criptográfica: esto solo
// identifica una instalación, no autentica nada. Se genera aquí en lugar de
// usar `uuid` o `expo-crypto` porque ninguno es dependencia declarada del
// proyecto (están en node_modules solo como dependencias transitivas).
function generateUuidV4(): string {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
		const random = (Math.random() * 16) | 0;
		const value = char === "x" ? random : (random & 0x3) | 0x8;
		return value.toString(16);
	});
}

/**
 * Identificador estable de ESTA instalación de la app.
 *
 * Es la identidad con la que el backend reconoce al dispositivo, porque el
 * expo push token no sirve para eso: rota al reinstalar, al restaurar en un
 * teléfono nuevo o cuando FCM/APNs vuelven a registrar la app. El device_id, en
 * cambio, se genera una vez y se persiste, así que los cambios de token
 * actualizan el registro existente en lugar de crear duplicados.
 *
 * Se pierde al desinstalar la app (AsyncStorage se borra con ella). Eso es
 * aceptable: la reinstalación crea un registro nuevo y el anterior lo retira la
 * limpieza del backend (DeviceNotRegistered o el cron de dispositivos inactivos).
 */
export async function getDeviceId(): Promise<string> {
	if (cachedDeviceId) return cachedDeviceId;
	if (inFlight) return inFlight;

	inFlight = (async () => {
		try {
			const stored = await AsyncStorage.getItem(STORAGE_KEY_DEVICE_ID);
			if (stored) {
				cachedDeviceId = stored;
				return stored;
			}

			const created = generateUuidV4();
			await AsyncStorage.setItem(STORAGE_KEY_DEVICE_ID, created);
			cachedDeviceId = created;
			return created;
		} finally {
			inFlight = null;
		}
	})();

	return inFlight;
}
