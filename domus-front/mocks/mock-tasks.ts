export const tasks: Task[] = [
    {
        id: 1,
        assigned_user_id: 1,
        name: "Limpiar la cocina",
        description: "Limpiar la cocina a fondo, incluyendo fregadero, encimeras y suelos.",
        due_date: "2026-02-22",
        reminder: false,
        frequency_type: "weekly",
        is_completed: false,
        is_strict: true,
        evidence_path: null,
        created_at: "2024-06-01T10:00:00Z",
        updated_at: "2024-06-01T10:00:00Z",
        deleted_at: null,
        completed_at: null,
    },
    {
        id: 2,
        assigned_user_id: 1,
        name: "Sacar la basura",
        description: "Sacar la basura los lunes, miércoles y viernes por la noche.",
        due_date: "2026-02-22",
        reminder: true,
        frequency_type: "daily",
        is_completed: true,
        is_strict: false,
        evidence_path: null,
        created_at: "2024-06-01T10:00:00Z",
        updated_at: "2024-06-01T10:00:00Z",
        deleted_at: null,
        completed_at: "2024-06-02T20:00:00Z",
    },
    {
        id: 3,
        assigned_user_id: 1,
        name: "Lavar los platos",
        description: "Lavar los platos de la cocina después de cada comida.",
        due_date: "2026-02-22",
        reminder: false,
        frequency_type: "daily",
        is_completed: false,
        is_strict: false,
        evidence_path: null,
        created_at: "2024-06-01T10:00:00Z",
        updated_at: "2024-06-01T10:00:00Z",
        deleted_at: null,
        completed_at: null,
    },
    {
        id: 4,
        assigned_user_id: 1,
        name: "Limpiar el baño",
        description: "Limpiar el baño a fondo, incluyendo lavabo, inodoro y ducha.",
        due_date: "2026-02-22",
        reminder: false,
        frequency_type: "weekly",
        is_completed: false,
        is_strict: true,
        evidence_path: null,
        created_at: "2024-06-01T10:00:00Z",
        updated_at: "2024-06-01T10:00:00Z",
        deleted_at: null,
        completed_at: null,
    }
];

export const mockReminders: Reminder[] = [
    {
        id: 1,
        task_id: 2,
        remind_at: "2024-06-02T19:00:00Z",
        created_at: "2024-06-01T10:00:00Z",
        updated_at: "2024-06-01T10:00:00Z",
        deleted_at: null,
    }
];

export interface Task {
    id: number;
    assigned_user_id?: number;
    name: string;
    description: string;
    due_date: string;
    reminder: boolean;
    frequency_type: "daily" | "weekly" | "monthly";
    is_completed: boolean;
    is_strict: boolean;
    evidence_path: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    completed_at: string | null;
}

export interface Reminder {
    id: number;
    task_id: number;
    remind_at: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}