import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Household } from "@/constants/types";
import axios from "@/api/axios";

const STORAGE_KEY_HOUSEHOLDS = "households";
const STORAGE_KEY_SELECTED = "householdIdSelected";

interface HomeState {
	households: Household[];
	householdIdSelected: string | null;

	selectedHome: Household | null;

	loadHouseholds: () => Promise<void>;
	refreshHomes: () => Promise<Household[]>;
	setHouseholds: (households: Household[]) => Promise<void>;
	clearHouseholds: () => Promise<void>;

	selectHome: (home: Household) => void;
}

const deriveSelected = (
	households: Household[],
	selectedId: string | null
): Household | null => {
	if (!selectedId) return null;
	return households.find((h) => h.id === selectedId) ?? null;
};

export const useHomeStore = create<HomeState>((set, get) => ({
	households: [],
	householdIdSelected: null,
	selectedHome: null,

	loadHouseholds: async () => {
		const [householdsRaw, selectedId] = await Promise.all([
			AsyncStorage.getItem(STORAGE_KEY_HOUSEHOLDS),
			AsyncStorage.getItem(STORAGE_KEY_SELECTED),
		]);

		const households: Household[] = householdsRaw
			? JSON.parse(householdsRaw)
			: [];

		set({
			households,
			householdIdSelected: selectedId,
			selectedHome: deriveSelected(households, selectedId),
		});
	},

	refreshHomes: async () => {
		const response = await axios.get('/homes/me');
		console.log("Fetched homes:", response.data); // Agrega este log para verificar la respuesta

		const households: Household[] = response.data;

		const currentSelectedId = get().householdIdSelected;

		const stillExists = households.some(
			(h) => h.id === currentSelectedId
		);

		const nextSelectedId = stillExists
			? currentSelectedId
			: households[0]?.id ?? null;

		await AsyncStorage.setItem(
			STORAGE_KEY_HOUSEHOLDS,
			JSON.stringify(households)
		);

		if (nextSelectedId) {
			await AsyncStorage.setItem(
				STORAGE_KEY_SELECTED,
				nextSelectedId
			);
		} else {
			await AsyncStorage.removeItem(STORAGE_KEY_SELECTED);
		}
		set({
			households,
			householdIdSelected: nextSelectedId,
			selectedHome: deriveSelected(households, nextSelectedId),
		});

		return households;
	},


	setHouseholds: async (households) => {
		const firstId = households[0]?.id ?? null;

		await AsyncStorage.setItem(
			STORAGE_KEY_HOUSEHOLDS,
			JSON.stringify(households)
		);
		if (firstId) {
			await AsyncStorage.setItem(STORAGE_KEY_SELECTED, firstId);
		} else {
			await AsyncStorage.removeItem(STORAGE_KEY_SELECTED);
		}

		set({
			households,
			householdIdSelected: firstId,
			selectedHome: deriveSelected(households, firstId),
		});
	},

	clearHouseholds: async () => {
		await AsyncStorage.multiRemove([
			STORAGE_KEY_HOUSEHOLDS,
			STORAGE_KEY_SELECTED,
		]);
		set({ households: [], householdIdSelected: null, selectedHome: null });
	},

	selectHome: async (home) => {
		await AsyncStorage.setItem(
			STORAGE_KEY_SELECTED,
			home.id
		);

		set({
			householdIdSelected: home.id,
			selectedHome: home,
		});
	},
}));