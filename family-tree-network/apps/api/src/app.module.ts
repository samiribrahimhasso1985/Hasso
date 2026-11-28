import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ConnectModule } from './connect/connect.module';
import { HealthController } from './health.controller';
import { IdentityModule } from './identity/identity.module';
import { MailModule } from './mail/mail.module';
import { PhotosModule } from './photos/photos.module';
import { GraphModule } from './graph/graph.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfilesModule } from './profiles/profiles.module';
import { RelationshipsModule } from './relationships/relationships.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 300) }]),
    PrismaModule,
    AuditModule,
    MailModule,
    AuthModule,
    ProfilesModule,
    RelationshipsModule,
    GraphModule,
    IdentityModule,
    PhotosModule,
    ConnectModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
