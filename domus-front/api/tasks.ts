import axios from "@/api/axios";

export type TaskFrequency = "once" | "daily" | "weekly" | "monthly";

// Human labels for the 1–5 physical effort scale used across create/detail.
export const EFFORT_LABELS: Record<number, string> = {
	1: "Muy bajo",
	2: "Bajo",
	3: "Medio",
	4: "Alto",
	5: "Muy alto",
};

// Flattened, screen-facing shape. The actionable/completable unit on the
// backend is the task OCCURRENCE, not the task template, so each ApiTask is one
// occurrence with its template fields (name, frequency…) hoisted up.
export type ApiTask = {
	id: string; // occurrence id
	task_id: string; // template id (used by edit/reassign flows)
	name: string;
	description?: string | null;
	due_date: string; // YYYY-MM-DD
	due_time?: string | null; // HH:MM:SS
	frequency_type: TaskFrequency;
	physical_effort: number; // 1–5
	is_completed: boolean;
	responsible_id?: string | null;
	completed_at?: string | null;
};

// Raw GET /task-occurrences row (occurrence with its nested task template).
// Internal to this module; screens consume the flattened ApiTask instead.
type RawTaskOccurrence = {
	id: string;
	task_id: string;
	user_id?: string | null;
	due_date: string;
	due_time?: string | null;
	completed_at?: string | null;
	task: {
		id: string;
		name: string;
		description?: string | null;
		frequency_type: TaskFrequency;
		physical_effort?: number;
	};
};

function toApiTask(occ: RawTaskOccurrence): ApiTask {
	return {
		id: occ.id,
		task_id: occ.task_id ?? occ.task.id,
		name: occ.task.name,
		description: occ.task.description ?? null,
		due_date: occ.due_date,
		due_time: occ.due_time ?? null,
		frequency_type: occ.task.frequency_type,
		physical_effort: occ.task.physical_effort ?? 3,
		is_completed: !!occ.completed_at,
		responsible_id: occ.user_id ?? null,
		completed_at: occ.completed_at ?? null,
	};
}

type GetTasksParams = {
	home_id: string;
	completed?: boolean;
	responsible_id?: string;
};

// Fetches the task occurrences of a household. Omitting `completed` returns both
// pending and completed occurrences so the screen can group them client-side.
export async function getTasks(params: GetTasksParams): Promise<ApiTask[]> {
	const response = await axios.get<RawTaskOccurrence[]>("/task-occurrences", {
		params: {
			home_id: params.home_id,
			user_id: params.responsible_id,
			completed:
				params.completed === undefined
					? undefined
					: params.completed
						? "true"
						: "false",
		},
	});
	return response.data.map(toApiTask);
}

// Fetches a single occurrence (with its template) for the detail screen.
export async function getTaskOccurrence(
	occurrenceId: string,
): Promise<ApiTask> {
	const response = await axios.get<RawTaskOccurrence>(
		`/task-occurrences/${occurrenceId}`,
	);
	return toApiTask(response.data);
}

// Toggles completion of an occurrence. The backend only allows the responsible
// member to toggle it, so callers should surface the resulting error.
export async function toggleTaskCompletion(
	occurrenceId: string,
): Promise<ApiTask> {
	const response = await axios.patch<RawTaskOccurrence>(
		`/task-occurrences/${occurrenceId}/toggle-completion`,
	);
	return toApiTask(response.data);
}

// Manually (re)assigns an occurrence to a specific household member.
export async function assignOccurrenceToUser(
	occurrenceId: string,
	userId: string,
): Promise<void> {
	await axios.patch(`/task-occurrences/${occurrenceId}/assign/${userId}`);
}

// Deletes a single occurrence.
export async function deleteTaskOccurrence(
	occurrenceId: string,
): Promise<void> {
	await axios.delete(`/task-occurrences/${occurrenceId}`);
}

export type AssignAllResult = {
	assigned: { occurrenceId: string; userId: string }[];
	unassigned: { occurrenceId: string; reason: "NO_AVAILABLE" }[];
};

// Runs the auto-assignment algorithm over every unassigned occurrence of a
// household. Returns which ones got a responsible and which had nobody available.
export async function assignAllForHome(
	homeId: string,
): Promise<AssignAllResult> {
	const response = await axios.post<AssignAllResult>(
		`/assignment/homes/${homeId}/assign-all`,
	);
	return response.data;
}
