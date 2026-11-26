import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EngineError } from '@ftn/relationship-engine';
import type { Response } from 'express';

const STATUS: Record<string, number> = {
  NOT_A_PARTY: HttpStatus.FORBIDDEN,
  NOT_A_CONFIRMER: HttpStatus.FORBIDDEN,
  ALREADY_REJECTED: HttpStatus.CONFLICT,
};

/** Maps engine and database errors to stable JSON error responses ({ code, message }). */
@Catch()
export class ErrorsFilter implements ExceptionFilter {
  private readonly log = new Logger('Errors');

  catch(err: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (err instanceof EngineError) {
      return res.status(STATUS[err.code] ?? HttpStatus.BAD_REQUEST).json({ code: err.code, message: err.message, ...err.details });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(HttpStatus.CONFLICT).json({ code: 'DUPLICATE', message: 'This record already exists' });
    }
    if (err instanceof HttpException) {
      const body = err.getResponse();
      return res.status(err.getStatus()).json(typeof body === 'string' ? { code: 'ERROR', message: body } : body);
    }
    this.log.error(err instanceof Error ? err.stack : String(err));
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ code: 'INTERNAL', message: 'Internal server error' });
  }
}

export class AppError extends HttpException {
  constructor(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
    super({ code, message, ...extra }, status);
  }
}
