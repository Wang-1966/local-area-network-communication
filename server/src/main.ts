import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getAppConfig, validateConfig } from './config/app.config';
import { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  // Get and validate configuration
  const config = getAppConfig();
  validateConfig(config);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: config.corsOrigin,
    credentials: true,
  });

  // Ensure uploads directory exists
  if (!fs.existsSync(config.uploadsPath)) {
    fs.mkdirSync(config.uploadsPath, { recursive: true });
  }

  // Serve uploaded files from uploads directory (before static assets)
  app.useStaticAssets(config.uploadsPath, {
    prefix: '/uploads',
  });

  // Serve static files from client/dist directory
  app.useStaticAssets(config.staticAssetsPath);

  await app.listen(config.port);
  
  console.log(`Application is running on: http://localhost:${config.port}`);
  console.log(`Serving static files from: ${config.staticAssetsPath}`);
  console.log(`Serving uploads from: ${config.uploadsPath}`);
  console.log(`CORS origin: ${config.corsOrigin}`);
}
bootstrap();
