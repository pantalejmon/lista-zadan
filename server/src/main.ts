import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.use(cookieParser());

  const corsOrigin = config.get<string>('cors.origin');
  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
    });
  }

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const port = process.env.PORT ?? config.get<number>('server.port', 3000);
  await app.listen(port);
}
bootstrap();
