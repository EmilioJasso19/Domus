import { Preference, PreferencePayloadItem } from "@/constants/types";
import axios from "@/api/axios";

export const getPreferences = async (
    homeId: string
): Promise<Preference[]> => {
    const res = await axios.get<Preference[]>(`/preferences/home/${homeId}`);
    return res.data;
};

export const saveManyPreferences = async (
    preferences: PreferencePayloadItem[],
    homeId: string
): Promise<void> => {
    await axios.post(`/preferences/many/${homeId}`, { preferences });
};
