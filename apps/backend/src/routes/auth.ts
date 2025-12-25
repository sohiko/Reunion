import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate, requireOwnership } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { AuditActionType } from '@reunion/shared';

const router = Router();

// ユーザー登録
router.post('/register',
  auditLog(AuditActionType.UPDATE, 'USER'),
  AuthController.register
);

// ログイン
router.post('/login',
  auditLog(AuditActionType.LOGIN, 'USER'),
  AuthController.login
);

// トークンリフレッシュ
router.post('/refresh',
  AuthController.refreshToken
);

// パスワード変更（認証必須）
router.post('/change-password',
  authenticate,
  requireOwnership(),
  auditLog(AuditActionType.UPDATE, 'USER'),
  AuthController.changePassword
);

// パスワードリセットリクエスト
router.post('/request-password-reset',
  auditLog(AuditActionType.UPDATE, 'USER'),
  AuthController.requestPasswordReset
);

// ログアウト
router.post('/logout',
  authenticate,
  auditLog(AuditActionType.LOGOUT, 'USER'),
  AuthController.logout
);

// 現在のユーザー情報取得
router.get('/me',
  authenticate,
  AuthController.getCurrentUser
);

export default router;
