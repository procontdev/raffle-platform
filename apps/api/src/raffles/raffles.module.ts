import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RafflesController } from './raffles.controller.js';
import { RafflesService } from './raffles.service.js';

@Module({ imports: [AuthModule], controllers: [RafflesController], providers: [RafflesService] })
export class RafflesModule {}
