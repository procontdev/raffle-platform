import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BrandsController } from './brands.controller.js';
import { BrandsService } from './brands.service.js';

@Module({ imports: [AuthModule], controllers: [BrandsController], providers: [BrandsService] })
export class BrandsModule {}
