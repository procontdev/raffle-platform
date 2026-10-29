import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Raffle Platform API')
    .setDescription('API for verifiable multi-brand raffles')
    .setVersion('0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('API_PORT') ?? 3001;
  const host = config.get<string>('API_HOST') ?? '0.0.0.0';
  await app.listen(port, host);
}

bootstrap();
