import 'dotenv/config';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'domus-db',
  // Relativo a __dirname y con ambas extensiones, igual que las migraciones: así
  // resuelve los .ts al correr por ts-node (CLI y seeds) y los .js compilados al
  // correr desde dist. Con un glob fijo a dist/, los seeds cargaban las clases
  // compiladas mientras importaban las de src, y TypeORM no encontraba metadata.
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
