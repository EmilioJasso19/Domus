import { IsString } from "class-validator";

export class CreateUserHomeRoleDto {
    @IsString()
    user_id: string;

    @IsString()
    home_id: string;

    @IsString()
    role_id: string;
}
