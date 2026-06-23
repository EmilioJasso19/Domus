import axios from "@/api/axios";
import { HomeItem, HouseholdMember } from "@/constants/types";

export type HomeDetailsResponse = {
	home: HomeItem;
	role: {
		id?: string;
		name: string;
	};
};

export async function getHomeDetails(homeId: string) {
	const response = await axios.get<HomeDetailsResponse>(`/homes/${homeId}`);
	return response.data;
}

export async function getHomeMembers(homeId: string) {
	const response = await axios.get<HouseholdMember[]>(
		`/homes/members/${homeId}`,
	);
	return response.data;
}

// Abandona el hogar. El backend desvincula al usuario, libera sus tareas y
// borra sus preferencias. Devuelve 409 si es el único administrador.
export async function leaveHome(homeId: string): Promise<void> {
	await axios.post(`/homes/${homeId}/leave`);
}

// Cambia el rol de un integrante del hogar. Solo los OWNER pueden hacerlo.
// El backend rechaza degradar al último administrador.
export async function updateMemberRole(
	homeId: string,
	userId: string,
	role: string,
): Promise<void> {
	await axios.patch(`/homes/${homeId}/members/${userId}/role`, { role });
}

// Expulsa a un integrante del hogar. Solo los OWNER pueden hacerlo. El backend
// rechaza expulsar al creador original, a uno mismo o al último administrador.
export async function expelMember(
	homeId: string,
	userId: string,
): Promise<void> {
	await axios.delete(`/homes/${homeId}/members/${userId}`);
}

// Genera un nuevo código de invitación e invalida el anterior. Solo los OWNER.
export async function regenerateInvitationCode(
	homeId: string,
): Promise<{ invitation_code: string }> {
	const response = await axios.post<{ invitation_code: string }>(
		`/homes/${homeId}/regenerate-code`,
	);
	return response.data;
}
