import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DiscordLogger } from './common/discord/discord.logger';

async function bootstrap() {
  // bufferLogs: retiene los logs hasta que el logger definitivo (que reenvía los
  // errores a Discord) esté disponible desde el contenedor de DI.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(DiscordLogger));
  app.useGlobalPipes(new ValidationPipe());
  const config = new DocumentBuilder()
    .setTitle('Domus API')
    .setDescription('Domus API description')
    .setVersion('1.0')
    .addTag('domus')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
