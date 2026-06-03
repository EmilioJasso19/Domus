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
