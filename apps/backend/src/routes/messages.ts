import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { authenticate, requireCoordinatorOrAbove } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { AuditActionType } from '@reunion/shared';

const router = Router();

// メッセージを送信
router.post('/',
  authenticate,
  auditLog(AuditActionType.SEND_MESSAGE, 'MESSAGE'),
  MessageController.sendMessage
);

// 一斉メッセージを送信（幹事以上）
router.post('/bulk',
  authenticate,
  requireCoordinatorOrAbove,
  auditLog(AuditActionType.SEND_MESSAGE, 'MESSAGE'),
  MessageController.sendBulkMessage
);

// メッセージを取得
router.get('/:messageId',
  authenticate,
  MessageController.getMessage
);

// 会話のメッセージ一覧を取得
router.get('/conversation/:conversationId',
  authenticate,
  MessageController.getConversationMessages
);

// 受信メッセージ一覧を取得
router.get('/received/all',
  authenticate,
  MessageController.getReceivedMessages
);

// 送信メッセージ一覧を取得
router.get('/sent/all',
  authenticate,
  MessageController.getSentMessages
);

// メッセージを既読にする
router.post('/:messageId/read',
  authenticate,
  MessageController.markAsRead
);

// メッセージを削除
router.delete('/:messageId',
  authenticate,
  auditLog(AuditActionType.DELETE, 'MESSAGE'),
  MessageController.deleteMessage
);

// 未読メッセージ数を取得
router.get('/unread/count',
  authenticate,
  MessageController.getUnreadCount
);

export default router;
