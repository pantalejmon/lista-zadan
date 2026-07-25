import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Honour X-Forwarded-* from the reverse proxy so req.protocol/host (and the OAuth
  // issuer derived from them) reflect the public URL, not the internal one.
  app.set('trust proxy', 1);

  // OAuth discovery documents must sit at the domain root, outside the `api` prefix.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: '.well-known/oauth-authorization-server', method: RequestMethod.GET },
      { path: '.well-known/oauth-protected-resource', method: RequestMethod.GET },
      { path: '.well-known/oauth-protected-resource/api/mcp', method: RequestMethod.GET },
    ],
  });

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
