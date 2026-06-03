import { HouseholdMember } from "@/constants/types";

export type WeeklyActivityItem = {
	userId: string;
	name: string;
	completedTasks: number;
};

const MOCK_COMPLETED_TASK_COUNTS = [12, 9, 7];

// Temporary frontend-only data until a weekly household activity endpoint exists.
export function buildMockWeeklyActivity(
	members: HouseholdMember[],
): WeeklyActivityItem[] {
	return members.slice(0, 3).map((member, index) => ({
		userId: member.user_id,
		name: member.name,
		completedTasks: MOCK_COMPLETED_TASK_COUNTS[index] ?? 0,
	}));
}
