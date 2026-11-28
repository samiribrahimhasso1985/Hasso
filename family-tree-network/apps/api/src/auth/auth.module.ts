import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';

function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET must be set (at least 32 characters)');
  if (process.env.NODE_ENV === 'production' && s.includes('dev-only')) throw new Error('Refusing to start with a development JWT secret');
  return s;
}

@Module({
  imports: [JwtModule.registerAsync({ global: true, useFactory: () => ({ secret: jwtSecret(), signOptions: { expiresIn: '12h' } }) })],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: JwtGuard }],
})
export class AuthModule {}
