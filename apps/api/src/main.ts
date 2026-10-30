import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready', 'livez'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  const allowedOrigins = (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3002').split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.use((request: { headers: Record<string, string | string[] | undefined> }, response: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    const requestIdHeader = request.headers['x-request-id'];
    const requestId = typeof requestIdHeader === 'string' && requestIdHeader.length <= 128 ? requestIdHeader : randomUUID();
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Raffle Platform API')
    .setDescription('API for verifiable multi-brand raffles')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('API_PORT') ?? 3001;
  const host = config.get<string>('API_HOST') ?? '0.0.0.0';
  await app.listen(port, host);
}

bootstrap();
