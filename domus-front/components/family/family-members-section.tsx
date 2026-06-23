import { HouseholdMember } from "@/constants/types";
import { useCallback } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

const avatarColors = [
	{ background: "#E0E7FF", text: "#1E3A8A" },
	{ background: "#FEE2E2", text: "#7F1D1D" },
	{ background: "#DCFCE7", text: "#14532D" },
	{ background: "#FEF3C7", text: "#78350F" },
];

const itemShadow = {
	shadowColor: "#111827",
	shadowOffset: { width: 0, height: 3 },
	shadowOpacity: 0.04,
	shadowRadius: 10,
	elevation: 1,
};

type FamilyMembersSectionProps = {
	members: HouseholdMember[];
	currentUserId?: string;
	isLoading: boolean;
	isOwner: boolean;
	onToggleRole: (userId: string, currentRole: string) => void;
	onExpel: (userId: string, displayName: string) => void;
};

export function FamilyMembersSection({
	members,
	currentUserId,
	isLoading,
	isOwner,
	onToggleRole,
	onExpel,
}: FamilyMembersSectionProps) {
	return (
		<View>
			<Text className="mb-4 text-2xl font-nunito-extrabold text-gray-900">
				Integrantes
			</Text>

			{isLoading ? (
				<View className="items-center rounded-3xl bg-white p-6">
					<ActivityIndicator color="#3A63FA" />
				</View>
			) : members.length === 0 ? (
				<View className="rounded-3xl bg-white p-6">
					<Text className="text-center text-base font-nunito text-gray-500">
						Todavía no hay integrantes para mostrar.
					</Text>
				</View>
			) : (
				<View className="gap-3">
					{members.map((member, index) => {
						const isCurrentUser = member.user_id === currentUserId;
						return (
							<MemberRow
								key={member.user_id}
								member={member}
								index={index}
								isCurrentUser={isCurrentUser}
								canToggle={isOwner}
								onToggleRole={onToggleRole}
								canSwipe={isOwner && !member.is_creator && !isCurrentUser}
								onExpel={onExpel}
							/>
						);
					})}
				</View>
			)}
		</View>
	);
}

function MemberRow({
	member,
	index,
	isCurrentUser,
	canToggle,
	onToggleRole,
	canSwipe,
	onExpel,
}: {
	member: HouseholdMember;
	index: number;
	isCurrentUser: boolean;
	canToggle: boolean;
	onToggleRole: (userId: string, currentRole: string) => void;
	canSwipe: boolean;
	onExpel: (userId: string, displayName: string) => void;
}) {
	const palette = avatarColors[index % avatarColors.length];
	const displayName = getDisplayName(member);
	const roleLabel = getRoleLabel(member.role);

	const renderRightActions = useCallback(() => {
		if (!canSwipe) return null;
		return (
			<View className="ml-3 justify-center">
				<Pressable
					onPress={() => onExpel(member.user_id, displayName)}
					className="h-full w-20 items-center justify-center rounded-3xl bg-red-500"
					accessibilityRole="button"
					accessibilityLabel={`Expulsar a ${displayName}`}
				>
					<Text className="text-sm font-nunito-bold text-white">Expulsar</Text>
				</Pressable>
			</View>
		);
	}, [canSwipe, member.user_id, displayName, onExpel]);

	const card = (
		<View
			className="min-h-[88px] flex-row items-center gap-4 rounded-3xl bg-white px-5 py-4"
			style={itemShadow}
		>
			<View
				className="h-14 w-14 items-center justify-center rounded-full"
				style={{ backgroundColor: palette.background }}
			>
				<Text
					className="text-xl font-nunito-extrabold"
					style={{ color: palette.text }}
				>
					{getInitials(member)}
				</Text>
				{isCurrentUser ? (
					<View
						className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white"
						style={{ backgroundColor: "#1A7330" }}
					/>
				) : null}
			</View>

			<View className="min-w-0 flex-1">
				<Text
					className="text-lg font-nunito-bold text-gray-900"
					numberOfLines={1}
				>
					{displayName}
				</Text>
				{isCurrentUser ? (
					<Text className="text-base font-nunito text-gray-500">Activo hoy</Text>
				) : null}
			</View>

			{canToggle ? (
				<Pressable
					onPress={() => onToggleRole(member.user_id, member.role)}
					hitSlop={12}
					accessibilityRole="button"
					accessibilityLabel={`Cambiar rol de ${displayName}`}
					className="rounded-full bg-gray-100 px-4 py-2 active:bg-gray-200"
				>
					<Text className="text-sm font-nunito-semibold text-gray-700">
						{roleLabel}
					</Text>
				</Pressable>
			) : (
				<View className="rounded-full bg-gray-100 px-4 py-2">
					<Text className="text-sm font-nunito-semibold text-gray-700">
						{roleLabel}
					</Text>
				</View>
			)}
		</View>
	);

	if (!canSwipe) {
		return card;
	}

	return (
		<Swipeable renderRightActions={renderRightActions} overshootRight={false}>
			{card}
		</Swipeable>
	);
}

function getDisplayName(member: HouseholdMember) {
	return [member.name, member.paternal_surname].filter(Boolean).join(" ");
}

function getInitials(member: HouseholdMember) {
	const first = member.name?.trim()[0] ?? "";
	const last = member.paternal_surname?.trim()[0] ?? "";
	const fallback = member.name
		?.trim()
		.split(" ")
		.slice(0, 2)
		.map((part) => part[0])
		.join("");

	return `${first}${last || fallback?.[1] || ""}`.toUpperCase();
}

function getRoleLabel(role: string) {
	return role.toUpperCase() === "OWNER" ? "Administrador" : "Miembro";
}
