import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompetitionsModule } from './modules/competitions/competitions.module';
import { ParticipantsModule } from './modules/participants/participants.module';

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
  ],
})
export class AppModule {}
