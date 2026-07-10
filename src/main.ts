import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Task List API')
    .setDescription(
      'A RESTful API for managing personal task lists with JWT authentication. ' +
        'Register a user, log in to get an access token, then use the Authorize ' +
        'button to call the protected endpoints.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the accessToken returned by POST /auth/login',
      },
      'access-token',
    )
    .addTag('auth', 'User registration and authentication')
    .addTag('users', 'Authenticated user profile')
    .addTag('tasks', 'Task management (requires authentication)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Task List API — Docs',
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
