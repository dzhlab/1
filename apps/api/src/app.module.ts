import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompetitionsModule } from './modules/competitions/competitions.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { GroupsModule } from './modules/groups/groups.module';
import { JudgesModule } from './modules/judges/judges.module';
import { ScoringModule } from './modules/scoring/scoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    CompetitionsModule,
    ParticipantsModule,
    GroupsModule,
    JudgesModule,
    ScoringModule,
  ],
})
export class AppModule {}
