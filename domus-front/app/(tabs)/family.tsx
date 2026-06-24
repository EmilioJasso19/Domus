import * as Clipboard from "expo-clipboard";
import { LogOut, Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	Share,
	Text,
	View,
} from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { FamilyInvitationCard } from "@/components/family/family-invitation-card";
import { FamilyMembersSection } from "@/components/family/family-members-section";
import { WeeklyActivitySection } from "@/components/family/weekly-activity-section";
import {
	expelMember,
	getHomeActivity,
	getHomeDetails,
	getHomeMembers,
	leaveHome,
	regenerateInvitationCode,
	updateMemberRole,
} from "@/api/homes";
import {
	HouseholdMember,
	HomeItem,
	RecentActivity,
	WeeklyActivityItem,
} from "@/constants/types";
import { useAuthStore } from "@/store/auth-store";
import { useHomeStore } from "@/store/home-store";
import { BACKGROUND, BLUE, ERROR } from "@/constants/colors";
import { EmptyState } from "@/components/empty-state";

// Agrupa las tareas completadas de la semana por integrante y las ordena de
// mayor a menor cantidad (ranking de actividad).
function aggregateWeeklyActivity(
	activity: RecentActivity[],
): WeeklyActivityItem[] {
	const byUser = new Map<string, { name: string; count: number }>();
	for (const item of activity) {
		const existing = byUser.get(item.user_id);
		if (existing) existing.count += 1;
		else byUser.set(item.user_id, { name: item.user_name, count: 1 });
	}
	return Array.from(byUser.entries())
		.map(([userId, v]) => ({
			userId,
			name: v.name,
			completedTasks: v.count,
		}))
		.sort((a, b) => b.completedTasks - a.completedTasks);
}

export default function FamilyScreen() {
	const router = useRouter();
	const { user } = useAuthStore();
	const { households, householdIdSelected, selectedHome, refreshHomes } =
		useHomeStore();

	const [home, setHome] = useState<HomeItem | null>(null);
	const [members, setMembers] = useState<HouseholdMember[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pendingRoles, setPendingRoles] = useState<Map<string, string>>(
		new Map(),
	);
	const [savingRoles, setSavingRoles] = useState(false);
	const [isRefreshingCode, setIsRefreshingCode] = useState(false);
	const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivityItem[]>(
		[],
	);

	const currentUserRole = members.find((m) => m.user_id === user?.id)?.role;
	const isOwner = currentUserRole?.toUpperCase() === "OWNER";
	const hasRoleChanges = pendingRoles.size > 0;

	const fallbackHome = useMemo(
		() =>
			selectedHome ??
			households.find((household) => household.id === householdIdSelected) ??
			null,
		[selectedHome, households, householdIdSelected],
	);

	const activeHome = home ?? fallbackHome;

	const loadFamilyData = useCallback(
		async (showRefresh = false) => {
			if (!householdIdSelected) {
				setHome(null);
				setMembers([]);
				setWeeklyActivity([]);
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

			const [homeResult, membersResult, activityResult] =
				await Promise.allSettled([
					getHomeDetails(householdIdSelected),
					getHomeMembers(householdIdSelected),
					getHomeActivity(householdIdSelected),
				]);

			if (homeResult.status === "fulfilled") {
				setHome(homeResult.value.home);
			}

			if (membersResult.status === "fulfilled") {
				setMembers(membersResult.value);
			} else {
				setMembers([]);
			}

			if (activityResult.status === "fulfilled") {
				setWeeklyActivity(aggregateWeeklyActivity(activityResult.value));
			} else {
				setWeeklyActivity([]);
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

	const handleLeave = useCallback(async () => {
		if (!householdIdSelected) return;
		try {
			await leaveHome(householdIdSelected);
			// refreshHomes reselecciona el primer hogar restante (o null).
			const remaining = await refreshHomes();
			if (remaining.length > 0) {
				Toast.show({ type: "success", text1: "Has abandonado el hogar" });
			} else {
				router.replace("/(tabs)");
			}
		} catch (err: any) {
			Toast.show({
				type: "error",
				text1: "No se pudo salir del hogar",
				text2:
					err?.response?.data?.message ??
					"Ocurrió un error. Inténtalo de nuevo.",
			});
		}
	}, [householdIdSelected, refreshHomes, router]);

	const handleLeavePrompt = useCallback(() => {
		Alert.alert(
			"Abandonar hogar",
			"¿Seguro que quieres salir de este hogar?\n\n• Perderás acceso a las tareas y la agenda compartida\n• Tus preferencias se eliminarán\n• Tus tareas pendientes quedarán sin asignar",
			[
				{ text: "Cancelar", style: "cancel" },
				{ text: "Salir", style: "destructive", onPress: handleLeave },
			],
		);
	}, [handleLeave]);

	const handleToggleRole = useCallback(
		(userId: string, currentRole: string) => {
			const newRole = currentRole.toUpperCase() === "OWNER" ? "MEMBER" : "OWNER";
			setPendingRoles((prev) => {
				const next = new Map(prev);
				next.set(userId, newRole);
				return next;
			});
		},
		[],
	);

	const handleSaveRoles = useCallback(async () => {
		if (!householdIdSelected || !hasRoleChanges || savingRoles) return;
		setSavingRoles(true);
		try {
			await Promise.all(
				Array.from(pendingRoles.entries()).map(([userId, role]) =>
					updateMemberRole(householdIdSelected, userId, role),
				),
			);
			setPendingRoles(new Map());
			await loadFamilyData(true);
			Toast.show({ type: "success", text1: "Roles actualizados" });
		} catch (err: any) {
			const msg =
				err?.response?.data?.message ?? "No se pudieron guardar los cambios.";
			Toast.show({ type: "error", text1: msg });
		} finally {
			setSavingRoles(false);
		}
	}, [
		householdIdSelected,
		hasRoleChanges,
		savingRoles,
		pendingRoles,
		loadFamilyData,
	]);

	const handleExpel = useCallback(
		async (userId: string) => {
			if (!householdIdSelected) return;
			try {
				await expelMember(householdIdSelected, userId);
				await loadFamilyData(true);
				Toast.show({ type: "success", text1: "Integrante expulsado" });
			} catch (err: any) {
				Toast.show({
					type: "error",
					text1: err?.response?.data?.message ?? "No se pudo expulsar al integrante",
				});
			}
		},
		[householdIdSelected, loadFamilyData],
	);

	const handleExpelPrompt = useCallback(
		(userId: string, displayName: string) => {
			Alert.alert(
				"Expulsar integrante",
				`¿Seguro que quieres expulsar a ${displayName} del hogar?\n\n• Perderá acceso a las tareas y la agenda compartida\n• Sus preferencias se eliminarán\n• Sus tareas pendientes quedarán sin asignar`,
				[
					{ text: "Cancelar", style: "cancel" },
					{
						text: "Expulsar",
						style: "destructive",
						onPress: () => handleExpel(userId),
					},
				],
			);
		},
		[handleExpel],
	);

	const handleRefreshCode = useCallback(async () => {
		if (!householdIdSelected || !activeHome || isRefreshingCode) return;
		setIsRefreshingCode(true);
		try {
			const { invitation_code } =
				await regenerateInvitationCode(householdIdSelected);
			setHome((prev) => (prev ? { ...prev, invitation_code } : null));
			Toast.show({ type: "success", text1: "Código actualizado" });
		} catch (err: any) {
			Toast.show({
				type: "error",
				text1: err?.response?.data?.message ?? "No se pudo actualizar el código",
			});
		} finally {
			setIsRefreshingCode(false);
		}
	}, [householdIdSelected, activeHome, isRefreshingCode]);

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

				<Text className="text-[26px] font-nunito-extrabold text-gray-900 mb-6">
					Mi familia
				</Text>

				{!householdIdSelected ? (
					<EmptyState title="Selecciona un hogar" subtitle="Cuando tengas un hogar activo, aquí verás el código de invitación y sus integrantes." />
				) : (
					<View className="gap-8">
						<FamilyInvitationCard
							householdName={activeHome?.name}
							invitationCode={activeHome?.invitation_code}
							isLoading={isLoading && !activeHome}
							onCopy={handleCopyCode}
							onShare={handleShareCode}
							onRefreshCode={handleRefreshCode}
							isRefreshingCode={isRefreshingCode}
							isOwner={isOwner}
						/>

						{error ? (
							<View className="rounded-2xl border border-red-100 bg-white p-4">
								<Text className="text-base font-nunito text-red-600">
									{error}
								</Text>
							</View>
						) : null}

						<FamilyMembersSection
							members={members.map((m) => ({
								...m,
								role: pendingRoles.get(m.user_id) ?? m.role,
							}))}
							currentUserId={user?.id}
							isLoading={isLoading}
							isOwner={isOwner}
							onToggleRole={handleToggleRole}
							onExpel={handleExpelPrompt}
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

						<Pressable
							onPress={handleLeavePrompt}
							accessibilityRole="button"
							accessibilityLabel="Salir del hogar"
							className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-2xl active:bg-red-50"
						>
							<LogOut size={20} color={ERROR} />
							<Text
								className="text-base font-nunito-bold"
								style={{ color: ERROR }}
							>
								Salir del hogar
							</Text>
						</Pressable>
					</View>
				)}
			</ScrollView>

			{/* ── Botón Guardar: visible solo cuando hay cambios de rol pendientes ── */}
			{hasRoleChanges ? (
				<View className="absolute inset-x-0 bottom-0 px-5 pb-8 pt-3">
					<Pressable
						onPress={handleSaveRoles}
						disabled={savingRoles}
						accessibilityRole="button"
						accessibilityLabel="Guardar cambios"
						className="h-14 items-center justify-center rounded-2xl"
						style={{ backgroundColor: BLUE, opacity: savingRoles ? 0.6 : 1 }}
					>
						{savingRoles ? (
							<ActivityIndicator color="#FFFFFF" />
						) : (
							<Text className="text-base font-nunito-bold text-white">
								Guardar cambios
							</Text>
						)}
					</Pressable>
				</View>
			) : null}
		</View>
	);
}