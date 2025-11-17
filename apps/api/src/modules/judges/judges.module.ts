import { Module } from '@nestjs/common';
import { JudgesService } from './judges.service';
import { JudgesController } from './judges.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JudgesController],
  providers: [JudgesService],
  exports: [JudgesService],
})
export class JudgesModule {}
