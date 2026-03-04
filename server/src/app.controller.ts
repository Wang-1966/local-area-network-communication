import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import { join } from 'path';
import { getAppConfig } from './config/app.config';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot(@Res() res: Response): void {
    const config = getAppConfig();
    res.sendFile(join(config.staticAssetsPath, 'index.html'));
  }
}
