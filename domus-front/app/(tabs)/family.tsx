import * as Clipboard from "expo-clipboard";
import { Plus } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Pressable,
	RefreshControl,
	ScrollView,
	Share,
	Text,
	View,
} from "react-native";
import Toast from "react-native-toast-message";
import { FamilyInvitationCard } from "@/components/family/family-invitation-card";
import { FamilyMembersSection } from "@/components/family/family-members-section";
import { WeeklyActivitySection } from "@/components/family/weekly-activity-section";
import { getHomeDetails, getHomeMembers } from "@/api/homes";
import { HouseholdMember, HomeItem } from "@/constants/types";
import { buildMockWeeklyActivity } from "@/mocks/mock-family-weekly-activity";
import { useAuthStore } from "@/store/auth-store";
import { useHomeStore } from "@/store/home-store";

const BACKGROUND = "#FAFAF8";
const BLUE = "#3A63FA";

export default function FamilyScreen() {
	const { user } = useAuthStore();
	const { households, householdIdSelected, selectedHome } = useHomeStore();

	const [home, setHome] = useState<HomeItem | null>(null);
	const [members, setMembers] = useState<HouseholdMember[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fallbackHome = useMemo(
		() =>
			selectedHome ??
			households.find((household) => household.id === householdIdSelected) ??
			null,
		[selectedHome, households, householdIdSelected],
	);

	const activeHome = home ?? fallbackHome;
	const weeklyActivity = useMemo(
		() => buildMockWeeklyActivity(members),
		[members],
	);

	const loadFamilyData = useCallback(
		async (showRefresh = false) => {
			if (!householdIdSelected) {
				setHome(null);
				setMembers([]);
				setIsLoading(false);
				setIsRefreshing(false);
				return;
			}

			if (showRefresh) {
				setIsRefreshing(true);
			} else {
				setIsLoading(true);
			}
			setError(null);

			const [homeResult, membersResult] = await Promise.allSettled([
				getHomeDetails(householdIdSelected),
				getHomeMembers(householdIdSelected),
			]);

			if (homeResult.status === "fulfilled") {
				setHome(homeResult.value.home);
			}

			if (membersResult.status === "fulfilled") {
				setMembers(membersResult.value);
			} else {
				setMembers([]);
			}

			if (
				homeResult.status === "rejected" &&
				membersResult.status === "rejected"
			) {
				setError("No pudimos cargar la información del hogar.");
			}

			setIsLoading(false);
			setIsRefreshing(false);
		},
		[householdIdSelected],
	);

	useEffect(() => {
		loadFamilyData();
	}, [loadFamilyData]);

	const handleCopyCode = useCallback(async () => {
		if (!activeHome?.invitation_code) return;
		await Clipboard.setStringAsync(activeHome.invitation_code);
		Toast.show({
			type: "success",
			text1: "Código copiado",
			text2: "Listo para compartir con tu hogar.",
		});
	}, [activeHome?.invitation_code]);

	const handleShareCode = useCallback(async () => {
		if (!activeHome?.invitation_code) return;

		await Share.share({
			message: `Únete a ${activeHome.name} en Domus con este código: ${activeHome.invitation_code}`,
		});
	}, [activeHome?.invitation_code, activeHome?.name]);

	return (
		<View className="flex-1" style={{ backgroundColor: BACKGROUND }}>
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-5 pb-32 pt-4"
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={() => loadFamilyData(true)}
						tintColor={BLUE}
						colors={[BLUE]}
					/>
				}
			>
				{!householdIdSelected ? (
					<EmptyHouseholdState />
				) : (
					<View className="gap-8">
						<FamilyInvitationCard
							householdName={activeHome?.name}
							invitationCode={activeHome?.invitation_code}
							isLoading={isLoading && !activeHome}
							onCopy={handleCopyCode}
							onShare={handleShareCode}
						/>

						{error ? (
							<View className="rounded-2xl border border-red-100 bg-white p-4">
								<Text className="text-base font-nunito text-red-600">
									{error}
								</Text>
							</View>
						) : null}

						<FamilyMembersSection
							members={members}
							currentUserId={user?.id}
							isLoading={isLoading}
						/>

						<Pressable
							onPress={handleShareCode}
							disabled={!activeHome?.invitation_code}
							accessibilityRole="button"
							accessibilityLabel="Invitar a alguien más"
							className="min-h-[56px] flex-row items-center justify-center gap-3 rounded-2xl border border-blue-200 bg-white active:bg-blue-50"
						>
							<Plus size={24} color={BLUE} />
							<Text className="text-lg font-nunito-bold text-gray-900">
								Invitar a alguien más
							</Text>
						</Pressable>

						<WeeklyActivitySection items={weeklyActivity} />
					</View>
				)}
			</ScrollView>
		</View>
	);
}

function EmptyHouseholdState() {
	return (
		<View className="items-center justify-center rounded-3xl bg-white p-8">
			<Text className="text-center text-lg font-nunito-bold text-gray-900">
				Selecciona un hogar
			</Text>
			<Text className="mt-2 text-center text-base font-nunito leading-6 text-gray-500">
				Cuando tengas un hogar activo, aquí verás el código de invitación y sus
				integrantes.
			</Text>
		</View>
	);
}
