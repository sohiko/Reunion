import { Router } from 'express';
import { VerificationController } from '../controllers/verificationController';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { UserRole, AuditActionType } from '@reunion/shared';

const router = Router();

// 身分証明書アップロード（一般会員）
router.post('/upload',
  authenticate,
  authorize([UserRole.GENERAL_MEMBER]),
  VerificationController.uploadMiddleware,
  auditLog(AuditActionType.UPLOAD, 'VERIFICATION_DOCUMENT'),
  VerificationController.uploadVerificationDocument
);

// 審査待ちの身分証明書一覧取得（役員）
router.get('/pending',
  authenticate,
  authorize([UserRole.OFFICER, UserRole.SYSTEM_ADMIN]),
  VerificationController.getPendingDocuments
);

// 身分証明書取得（署名付きURL付き、役員）
router.get('/:documentId',
  authenticate,
  authorize([UserRole.OFFICER, UserRole.SYSTEM_ADMIN]),
  auditLog(AuditActionType.VIEW, 'VERIFICATION_DOCUMENT'),
  VerificationController.getVerificationDocument
);

// 身分証明書審査（承認・拒否、役員）
router.post('/:documentId/review',
  authenticate,
  authorize([UserRole.OFFICER, UserRole.SYSTEM_ADMIN]),
  auditLog(AuditActionType.APPROVE, 'VERIFICATION_DOCUMENT'),
  VerificationController.reviewDocument
);

// ユーザーの身分証明書一覧取得（本人または役員）
router.get('/user/:userId?',
  authenticate,
  VerificationController.getUserVerificationDocuments
);

export default router;
