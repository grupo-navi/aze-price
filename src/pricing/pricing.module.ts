import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { PricingScheduler } from './pricing.scheduler';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [PricingService, PricingScheduler, PrismaService],
  controllers: [PricingController],
})
export class PricingModule {}
