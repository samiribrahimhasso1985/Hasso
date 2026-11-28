process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://ftn:ftn_dev@localhost:5432/ftn_test?schema=public';
process.env.JWT_SECRET = 'test-secret-dev-only-0123456789abcdefghij';
process.env.AUTH_RATE_LIMIT_PER_MINUTE = '1000';
process.env.RATE_LIMIT_PER_MINUTE = '100000';
process.env.NODE_ENV = 'test';
process.env.QR_TOKEN_KEY = 'test-qr-key-dev-only-0123456789abcdefghij';
process.env.MAIL_TRANSPORT = 'outbox';
process.env.BCRYPT_ROUNDS = '4';
process.env.APP_URL = 'http://app.test';
