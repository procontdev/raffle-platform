import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { OrganizationModule } from './organization/organization.module.js';
import { BrandsModule } from './brands/brands.module.js';
import { RafflesModule } from './raffles/raffles.module.js';
import { ParticipantsModule } from './participants/participants.module.js';
import { RaffleEntriesModule } from './raffle-entries/raffle-entries.module.js';
import { DrawModule } from './draw/draw.module.js';
import { LiveModule } from './live/live.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    PrismaModule,
    HealthModule,
    AuthModule,
    OrganizationModule,
    BrandsModule,
    RafflesModule,
    ParticipantsModule,
    RaffleEntriesModule,
    DrawModule,
    LiveModule,
  ],
})
export class AppModule {}
