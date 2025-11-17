import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Gymnastics Competition Platform API')
    .setDescription('API для платформы управления соревнованиями по художественной гимнастике')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Аутентификация и авторизация')
    .addTag('competitions', 'Управление соревнованиями')
    .addTag('judges', 'Управление судьями')
    .addTag('participants', 'Управление участниками')
    .addTag('groups', 'Группы и потоки')
    .addTag('scoring', 'Судейство и оценки')
    .addTag('brigades', 'Судейские бригады')
    .addTag('results', 'Результаты и рейтинги')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`
    🚀 Application is running on: http://localhost:${port}
    📚 Swagger documentation: http://localhost:${port}/api/docs
    🔌 WebSocket endpoint: ws://localhost:${port}
  `);
}

bootstrap();
