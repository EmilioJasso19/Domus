export type Task = {
id: number;
	name: string;
	due_time?: string | null;
	responsible_name?: string | null;
	room?: string | null;
	is_completed: boolean;
};

export type HomeItem = { id: string; name: string };

export type Activity = {
	id: string;
	actor: string;
	action: string;
	target: string;
	timeAgo: string;
};

export type Household = { id: string; name: string };