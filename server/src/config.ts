const NODE_ENV = process.env.NODE_ENV || 'development';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for authentication');
}

export const config = {
  env: NODE_ENV,
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
  enableDemoLogin: process.env.ENABLE_DEMO_LOGIN === 'true' || NODE_ENV !== 'production',
  demoEmail: process.env.DEMO_EMAIL || 'demo@posture.app',
  demoPassword: process.env.DEMO_PASSWORD || 'demo123',
};
