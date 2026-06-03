import axios from "@/api/axios";

export type TaskFrequency = "daily" | "weekly" | "monthly" | "custom";

// Shape returned by the NestJS tasks module (GET /tasks).
// Mirrors the Task entity; fields the backend does not expose yet
// (e.g. a due time of day) are intentionally absent.
export type ApiTask = {
	id: string;
	name: string;
	description?: string | null;
	due_date: string; // YYYY-MM-DD
	frequency_type: TaskFrequency;
	is_completed: boolean;
	responsible_id?: string | null;
	completed_at?: string | null;
};

type GetTasksParams = {
	home_id: string;
	completed?: boolean;
	responsible_id?: string;
};

// Fetches the tasks of a household. Omitting `completed` returns both
// pending and completed tasks so the screen can group them client-side.
export async function getTasks(params: GetTasksParams): Promise<ApiTask[]> {
	const response = await axios.get<ApiTask[]>("/tasks", { params });
	return response.data;
}

// Toggles completion. The backend only allows the responsible member to
// toggle a task, so callers should surface the resulting error.
export async function toggleTaskCompletion(taskId: string): Promise<ApiTask> {
	const response = await axios.patch<ApiTask>(
		`/tasks/${taskId}/toggle-completion`,
	);
	return response.data;
}
