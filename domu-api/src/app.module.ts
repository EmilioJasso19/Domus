import { Module, } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { join } from 'path';
import { TasksModule } from './tasks/tasks.module';
import { HomeModule } from './home/home.module';
import { AuthModule } from './auth/auth.module';
import { UserHomeRoleModule } from './user-home-role/user-home-role.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'db-nestjs',
      entities: [join(process.cwd(), 'dist/**/*.entity{.ts,.js}')],
      synchronize: false,
      migrations: ['dist/migrations/*.js'],
      logging: true,
    }),
    UsersModule,
    TasksModule,
    HomeModule,
    AuthModule,
    UserHomeRoleModule,
    RoleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
