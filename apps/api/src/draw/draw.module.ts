import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DrawController } from './draw.controller.js';
import { DrawService } from './draw.service.js';
import { PublicDrawController } from './public-draw.controller.js';

@Module({ imports: [AuthModule], controllers: [DrawController, PublicDrawController], providers: [DrawService] })
export class DrawModule {}
