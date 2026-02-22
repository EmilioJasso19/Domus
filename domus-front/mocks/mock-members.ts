// id|name|paternal_surname|maternal_surname|email|created_at|updated_at|deleted_at
export const mockMembers: Member[] = [
    {
        id: 1,
        name: "Juan",
        paternal_surname: "Pérez",
        maternal_surname: "García",
        email: "juan.perez@example.com",
        created_at: "2024-06-01T10:00:00Z",
        updated_at: "2024-06-01T10:00:00Z",
        deleted_at: null,
    },
    {
        id: 2,
        name: "María",
        paternal_surname: "López",
        maternal_surname: "Martínez",
        email: "maria.lopez@example.com",
        created_at: "2024-06-01T10:00:00Z",
        updated_at: "2024-06-01T10:00:00Z",
        deleted_at: null,
    },
    {
        id: 3,
        name: "Carlos",
        paternal_surname: "Gómez",
        maternal_surname: "Rodríguez",
        email: "carlos.gomez@example.com",
        created_at: "2024-06-01T10:00:00Z",
        updated_at: "2024-06-01T10:00:00Z",
        deleted_at: null,
    },
];

export interface Member {
    id: number;
    name: string;
    paternal_surname: string;
    maternal_surname: string;
    email: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}