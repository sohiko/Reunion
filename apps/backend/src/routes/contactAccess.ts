import { Router } from 'express';
import { ContactAccessController } from '../controllers/contactAccessController';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { AuditActionType } from '@reunion/shared';

const router = Router();

// 連絡先開示許可申請を作成
router.post('/request',
  authenticate,
  auditLog(AuditActionType.UPDATE, 'CONTACT_ACCESS_REQUEST'),
  ContactAccessController.createContactAccessRequest
);

// 連絡先アクセスリクエストを取得
router.get('/:requestId',
  authenticate,
  ContactAccessController.getContactAccessRequest
);

// 受信した連絡先アクセスリクエスト一覧を取得
router.get('/received/all',
  authenticate,
  ContactAccessController.getReceivedRequests
);

// 送信した連絡先アクセスリクエスト一覧を取得
router.get('/sent/all',
  authenticate,
  ContactAccessController.getSentRequests
);

// 連絡先アクセスリクエストを承認・拒否
router.post('/:requestId/respond',
  authenticate,
  auditLog(AuditActionType.APPROVE, 'CONTACT_ACCESS_REQUEST'),
  ContactAccessController.respondToRequest
);

// 承認済みの連絡先情報を取得
router.get('/contact/:subjectId',
  authenticate,
  auditLog(AuditActionType.VIEW, 'CONTACT'),
  ContactAccessController.getApprovedContactInfo
);

export default router;
