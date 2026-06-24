export type Task = {
id: number;
	name: string;
	due_time?: string | null;
	responsible_name?: string | null;
	room?: string | null;
	is_completed: boolean;
};

export type HomeItem = {
	id: string;
	name: string;
	invitation_code?: string;
	points: string;
};

export type Activity = {
	id: string;
	actor: string;
	action: string;
	target: string;
	timeAgo: string;
};

// Tarea completada esta semana, devuelta por GET /homes/:id/activity.
export type RecentActivity = {
	id: string;
	user_id: string;
	task_name: string;
	user_name: string;
	completed_at: string;
};

// Resumen por integrante de las tareas completadas en la semana (ranking).
export type WeeklyActivityItem = {
	userId: string;
	name: string;
	completedTasks: number;
};

export type Household = {
	id: string;
	name: string;
	invitation_code?: string;
	points: string;
};

export type HouseholdMember = {
	user_id: string;
	name: string;
	paternal_surname: string;
	maternal_surname?: string | null;
	role: string;
	is_creator?: boolean;
};

export type Preference = {
	user_id: string;
	task_id: string;
	score: number; // -1 = like, 0 = neutral, 1 = dislike
	task: {
		id: string;
		name: string;
	};
};

// Item enviado al backend al guardar preferencias (POST /preferences/many/:homeId).
export type PreferencePayloadItem = {
	task_id: string;
	score: number;
};
