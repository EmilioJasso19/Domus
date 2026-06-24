import axios from "@/api/axios";

// La PK de la mascota es el home_id, así que :id en las rutas es el ID del hogar.
export type VirtualPet = {
	home_id: string;
	name: string;
	level: number;
};

export async function getPet(homeId: string): Promise<VirtualPet> {
	const response = await axios.get<VirtualPet>(`/virtual-pet/${homeId}`);
	return response.data;
}

export async function updatePetName(
	homeId: string,
	name: string,
): Promise<VirtualPet> {
	const response = await axios.patch<VirtualPet>(`/virtual-pet/${homeId}`, {
		name,
	});
	return response.data;
}
