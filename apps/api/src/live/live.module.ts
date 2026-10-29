import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LiveController } from './live.controller.js';
import { LiveGateway } from './live.gateway.js';
import { LiveService } from './live.service.js';

@Module({ imports: [AuthModule], controllers: [LiveController], providers: [LiveGateway, LiveService], exports: [LiveService] })
export class LiveModule {}
