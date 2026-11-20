import axios from "@/api/axios";

type MessageResponse = { message: string };

// Recuperación de contraseña. Ambos endpoints son públicos y están en
// AUTH_ENDPOINTS_WITHOUT_RETRY (api/axios.ts): un 4xx aquí nunca debe disparar
// el refresh del token.

// El backend responde 200 exista o no la cuenta (no revela correos registrados).
export async function requestPasswordReset(email: string) {
	const response = await axios.post<MessageResponse>(
		"/auth/request-reset-password",
		{ email },
	);
	return response.data;
}

// En éxito el backend cierra todas las sesiones y no devuelve tokens: hay que
// mandar al usuario al login.
export async function resetPassword(data: {
	email: string;
	code: string;
	new_password: string;
}) {
	const response = await axios.post<MessageResponse>(
		"/auth/reset-password",
		data,
	);
	return response.data;
}

export function passwordResetErrorMessage(error: any): string {
	switch (error?.status ?? error?.response?.status) {
		case 400:
			return "Código inválido o expirado. Revisa el código o pide uno nuevo.";
		case 429:
			return "Demasiados intentos. Espera un minuto e inténtalo de nuevo.";
		case 500:
		case 502:
		case 503:
			return "Error del servidor. Inténtalo más tarde.";
		default:
			return "Algo salió mal. Revisa tu conexión e inténtalo de nuevo.";
	}
}
