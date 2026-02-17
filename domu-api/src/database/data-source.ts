import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { Task } from '@/tasks/entities/task.entity';
import { UserHomeRole } from '@/user-home-role/entities/user-home-role.entity';
import { Home } from '@/home/entities/home.entity';
import { Role } from '@/role/entities/role.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'domus-db',
  entities: [User, Task, Home, Role, UserHomeRole], // TODO: entities: ['dist/**/*.entity.js'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
