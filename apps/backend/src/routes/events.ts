import { Router } from 'express';
import { EventController } from '../controllers/eventController';
import { authenticate, authorize, requireCoordinatorOrAbove } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { UserRole, AuditActionType } from '@reunion/shared';

const router = Router();

// イベントを作成（幹事以上）
router.post('/',
  authenticate,
  requireCoordinatorOrAbove,
  auditLog(AuditActionType.UPDATE, 'EVENT'),
  EventController.createEvent
);

// イベント一覧を取得
router.get('/',
  authenticate,
  EventController.getEvents
);

// イベントを取得
router.get('/:eventId',
  authenticate,
  EventController.getEvent
);

// イベントを更新（幹事以上）
router.put('/:eventId',
  authenticate,
  requireCoordinatorOrAbove,
  auditLog(AuditActionType.UPDATE, 'EVENT'),
  EventController.updateEvent
);

// イベントを削除（幹事以上）
router.delete('/:eventId',
  authenticate,
  requireCoordinatorOrAbove,
  auditLog(AuditActionType.DELETE, 'EVENT'),
  EventController.deleteEvent
);

// 出欠登録
router.post('/:eventId/attendance',
  authenticate,
  auditLog(AuditActionType.UPDATE, 'ATTENDANCE'),
  EventController.registerAttendance
);

// 出欠状況を取得（幹事以上）
router.get('/:eventId/attendance',
  authenticate,
  requireCoordinatorOrAbove,
  EventController.getAttendanceList
);

// イベント通知を送信（幹事以上）
router.post('/:eventId/notify',
  authenticate,
  requireCoordinatorOrAbove,
  auditLog(AuditActionType.SEND_MESSAGE, 'EVENT'),
  EventController.sendEventNotification
);

// イベントを公開（幹事以上）
router.post('/:eventId/publish',
  authenticate,
  requireCoordinatorOrAbove,
  auditLog(AuditActionType.UPDATE, 'EVENT'),
  EventController.publishEvent
);

// イベントをキャンセル（幹事以上）
router.post('/:eventId/cancel',
  authenticate,
  requireCoordinatorOrAbove,
  auditLog(AuditActionType.UPDATE, 'EVENT'),
  EventController.cancelEvent
);

export default router;
