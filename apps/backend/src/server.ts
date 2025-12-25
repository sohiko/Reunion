import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config';
import { JobScheduler } from './services/jobScheduler';

// 設定の検証
validateConfig();

import authRoutes from './routes/auth';
import verificationRoutes from './routes/verification';
import contactAccessRoutes from './routes/contactAccess';
import eventRoutes from './routes/events';
import messageRoutes from './routes/messages';

const app = express();
const PORT = config.app.port;

// セキュリティミドルウェア
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS設定
app.use(cors({
  origin: config.app.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 圧縮
app.use(compression());

// Cookieパーサー
app.use(cookieParser());

// Bodyパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.app.env,
  });
});

// APIルート
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/contacts', contactAccessRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/messages', messageRoutes);

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// エラーハンドリングミドルウェア
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);

  // Prismaエラーのハンドリング
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'A record with this information already exists'
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found'
    });
  }

  // JWTエラーのハンドリング
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }

  // 一般的なエラーレスポンス
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// ジョブスケジューラーの起動（本番環境のみ）
let jobScheduler: JobScheduler | undefined;
if (config.app.env === 'production') {
  jobScheduler = new JobScheduler();
  jobScheduler.start();
}

// サーバー起動
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${config.app.env}`);
    console.log(`🌐 Frontend URL: ${config.app.frontendUrl}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    if (jobScheduler) {
      console.log(`⏰ Job scheduler: Active`);
    }
  });
}

export default app;
