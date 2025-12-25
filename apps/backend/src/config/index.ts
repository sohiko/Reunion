import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

export const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/reunion_db',
  },

  // JWT
  jwt: {
    secretKey: process.env.JWT_SECRET_KEY || 'default-secret-key-change-in-production',
    refreshSecretKey: process.env.JWT_REFRESH_SECRET_KEY || 'default-refresh-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars-long',
    iv: process.env.ENCRYPTION_IV || 'default-iv-16-chars-long',
  },

  // Email
  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    mailgunApiKey: process.env.MAILGUN_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'noreply@reunion-app.com',
  },

  // SMS
  sms: {
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  // Cloudflare R2
  r2: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'reunion-documents',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // App Config
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    apiUrl: process.env.API_URL || 'http://localhost:3001',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // File Upload
  fileUpload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg').split(','),
  },

  // Security
  security: {
    bcryptRounds: 12,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },

  // Data Retention
  dataRetention: {
    auditLogsYears: 90,
    consentRecordsYears: 90,
    verificationDocumentsDays: 30,
  },
} as const;

// バリデーション
export function validateConfig() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET_KEY',
    'ENCRYPTION_KEY',
  ];

  const missing = requiredEnvVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // 開発環境以外ではより厳格なチェック
  if (config.app.env !== 'development') {
    const productionRequired = [
      'SENDGRID_API_KEY',
      'CLOUDFLARE_R2_ACCESS_KEY_ID',
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    ];

    const missingProd = productionRequired.filter(key => !process.env[key]);
    if (missingProd.length > 0) {
      throw new Error(`Missing required production environment variables: ${missingProd.join(', ')}`);
    }
  }
}
