import { Router } from 'express';
import { EventController } from '../controllers/eventController';
import { authenticate, requireCoordinatorOrAbove } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { AuditActionType } from '@reunion/shared';

const router = Router();

// イベントを作成（幹事以上）
router.post('/',
  authenticate,
  requireCoordinatorOrAbove,
  auditLog(AuditActionType.UPDATE, 'event'),
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
  auditLog(AuditActionType.UPDATE, 'event'),
  EventController.updateEvent
);

// イベントを削除（幹事以上）
router.delete('/:eventId',
  authenticate,
  requireCoordinatorOrAbove,
  auditLog(AuditActionType.DELETE, 'event'),
  EventController.deleteEvent
);

// 出欠登録
router.post('/:eventId/attendance',
  authenticate,
  auditLog(AuditActionType.UPDATE, 'attendance'),
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
  auditLog(AuditActionType.SEND_MESSAGE, 'event'),
  EventController.sendEventNotification
);

// イベントを公開（幹事以上）
router.post('/:eventId/publish',
  authenticate,
  requireCoordinatorOrAbove,
  auditLog(AuditActionType.UPDATE, 'event'),
  EventController.publishEvent
);

// イベントをキャンセル（幹事以上）
router.post('/:eventId/cancel',
  authenticate,
  requireCoordinatorOrAbove,
  auditLog(AuditActionType.UPDATE, 'event'),
  EventController.cancelEvent
);

export default router;
