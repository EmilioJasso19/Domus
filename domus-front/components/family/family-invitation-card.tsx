import { Copy, Home, Share2 } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

const BLUE = "#3A63FA";

const cardShadow = {
	shadowColor: "#111827",
	shadowOffset: { width: 0, height: 4 },
	shadowOpacity: 0.06,
	shadowRadius: 12,
	elevation: 2,
};

type FamilyInvitationCardProps = {
	householdName?: string;
	invitationCode?: string;
	isLoading: boolean;
	onCopy: () => void;
	onShare: () => void;
};

export function FamilyInvitationCard({
	householdName,
	invitationCode,
	isLoading,
	onCopy,
	onShare,
}: FamilyInvitationCardProps) {
	const hasCode = Boolean(invitationCode);

	return (
		<View
			className="rounded-3xl border border-gray-200 bg-white p-5"
			style={cardShadow}
		>
			<View className="mb-4 flex-row items-center justify-between gap-4">
				<View className="flex-row items-center gap-3">
					<View className="h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
						<Home size={23} color={BLUE} />
					</View>
					<View>
						<Text className="text-xl font-nunito-extrabold text-gray-900">
							Código de hogar
						</Text>
						{householdName ? (
							<Text className="text-sm font-nunito text-gray-500">
								{householdName}
							</Text>
						) : null}
					</View>
				</View>

				<Pressable
					onPress={onShare}
					disabled={!hasCode}
					accessibilityRole="button"
					accessibilityLabel="Compartir código de invitación"
					className="h-11 w-11 items-center justify-center rounded-2xl active:bg-blue-50"
				>
					<Share2 size={22} color={hasCode ? BLUE : "#9CA3AF"} />
				</Pressable>
			</View>

			<View className="min-h-[72px] flex-row items-center rounded-2xl bg-gray-50 px-5">
				{isLoading ? (
					<ActivityIndicator color={BLUE} />
				) : (
					<>
						<Text
							className="flex-1 text-[24px] font-nunito-extrabold tracking-[3px] text-gray-900"
							numberOfLines={1}
							adjustsFontSizeToFit
							minimumFontScale={0.75}
						>
							{invitationCode ?? "Sin código"}
						</Text>
						<Pressable
							onPress={onCopy}
							disabled={!hasCode}
							accessibilityRole="button"
							accessibilityLabel="Copiar código de invitación"
							className="h-11 w-11 items-center justify-center rounded-xl active:bg-white"
						>
							<Copy size={23} color={hasCode ? BLUE : "#9CA3AF"} />
						</Pressable>
					</>
				)}
			</View>

			<Text className="mt-4 text-base font-nunito leading-6 text-gray-600">
				Comparte este código con los miembros de tu hogar para que se unan.
			</Text>
		</View>
	);
}
