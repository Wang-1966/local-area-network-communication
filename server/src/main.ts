import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getAppConfig, validateConfig } from './config/app.config';
import { Request, Response, NextFunction } from 'express';
import * as path from 'path';

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

  // Serve static files from client/dist directory
  app.useStaticAssets(config.staticAssetsPath);

  // SPA route fallback: serve index.html for all non-API routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip WebSocket and API routes
    if (req.path.startsWith('/socket.io') || req.path.startsWith('/api')) {
      return next();
    }
    
    // For all other routes, check if it's a file request
    const filePath = path.join(config.staticAssetsPath, req.path);
    
    // If the requested path doesn't have a file extension, serve index.html
    if (!path.extname(req.path)) {
      res.sendFile(path.join(config.staticAssetsPath, 'index.html'));
    } else {
      next();
    }
  });

  await app.listen(config.port);
  
  console.log(`Application is running on: http://localhost:${config.port}`);
  console.log(`Serving static files from: ${config.staticAssetsPath}`);
  console.log(`CORS origin: ${config.corsOrigin}`);
}
bootstrap();
