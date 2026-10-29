import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CsvImportService } from './csv-import.service.js';
import { RaffleEntriesController } from './raffle-entries.controller.js';
import { RaffleEntriesService } from './raffle-entries.service.js';

@Module({ imports: [AuthModule], controllers: [RaffleEntriesController], providers: [RaffleEntriesService, CsvImportService] })
export class RaffleEntriesModule {}
