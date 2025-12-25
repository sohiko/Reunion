import { Request, Response } from 'express';
import { EventService, CreateEventData, UpdateEventData } from '../services/eventService';
import { ApiResponse, AttendanceStatus, EventStatus } from '@reunion/shared';
import { auditLog } from '../middleware/audit';
import { AuditActionType } from '@reunion/shared';

const eventService = new EventService();

export class EventController {
  /**
   * イベントを作成
   */
  static async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const eventData: CreateEventData = req.body;
      const creatorId = req.user!.user_id;

      const event = await eventService.createEvent(creatorId, eventData);

      const response: ApiResponse = {
        success: true,
        message: 'Event created successfully',
        data: { event }
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event'
      };
      res.status(400).json(response);
    }
  }

  /**
   * イベントを取得
   */
  static async getEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user?.user_id;

      const event = await eventService.getEvent(eventId, userId);

      if (!event) {
        const response: ApiResponse = {
          success: false,
          error: 'Event not found or access denied'
        };
        res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: { event }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch event'
      };
      res.status(500).json(response);
    }
  }

  /**
   * イベント一覧を取得
   */
  static async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.user_id;
      const {
        event_type,
        status,
        graduation_year,
        date_from,
        date_to,
        page = '1',
        limit = '20'
      } = req.query;

      const filters = {
        event_type: event_type as any,
        status: status as any,
        graduation_year: graduation_year ? parseInt(graduation_year as string) : undefined,
        date_from: date_from ? new Date(date_from as string) : undefined,
        date_to: date_to ? new Date(date_to as string) : undefined,
      };

      const result = await eventService.getEvents(
        userId,
        filters,
        parseInt(page as string),
        parseInt(limit as string)
      );

      const response: ApiResponse = {
        success: true,
        data: {
          events: result.events,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: result.total,
            totalPages: result.totalPages,
          }
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch events'
      };
      res.status(500).json(response);
    }
  }

  /**
   * イベントを更新
   */
  static async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const updateData: UpdateEventData = req.body;
      const updaterId = req.user!.user_id;

      const event = await eventService.updateEvent(eventId, updaterId, updateData);

      const response: ApiResponse = {
        success: true,
        message: 'Event updated successfully',
        data: { event }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update event'
      };
      res.status(400).json(response);
    }
  }

  /**
   * イベントを削除
   */
  static async deleteEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const deleterId = req.user!.user_id;

      await eventService.deleteEvent(eventId, deleterId);

      const response: ApiResponse = {
        success: true,
        message: 'Event deleted successfully'
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete event'
      };
      res.status(400).json(response);
    }
  }

  /**
   * 出欠登録
   */
  static async registerAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { status, notes } = req.body;
      const userId = req.user!.user_id;

      if (!Object.values(AttendanceStatus).includes(status)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid attendance status'
        };
        res.status(400).json(response);
      }

      await eventService.registerAttendance(eventId, userId, status, notes);

      const response: ApiResponse = {
        success: true,
        message: 'Attendance registered successfully'
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register attendance'
      };
      res.status(400).json(response);
    }
  }

  /**
   * 出欠状況を取得
   */
  static async getAttendanceList(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const requesterId = req.user!.user_id;

      const attendances = await eventService.getAttendanceList(eventId, requesterId);

      const response: ApiResponse = {
        success: true,
        data: { attendances }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch attendance list'
      };
      res.status(400).json(response);
    }
  }

  /**
   * イベント通知を送信
   */
  static async sendEventNotification(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const requesterId = req.user!.user_id;

      // TODO: イベント作成者のみ許可する権限チェックを追加

      await eventService.sendEventNotification(eventId);

      const response: ApiResponse = {
        success: true,
        message: 'Event notifications sent successfully'
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send event notifications'
      };
      res.status(500).json(response);
    }
  }

  /**
   * イベントを公開
   */
  static async publishEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const publisherId = req.user!.user_id;

      const event = await eventService.updateEvent(eventId, publisherId, {
        status: EventStatus.PUBLISHED
      });

      // 通知を送信
      await eventService.sendEventNotification(eventId);

      const response: ApiResponse = {
        success: true,
        message: 'Event published and notifications sent',
        data: { event }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish event'
      };
      res.status(400).json(response);
    }
  }

  /**
   * イベントをキャンセル
   */
  static async cancelEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const cancellerId = req.user!.user_id;

      const event = await eventService.updateEvent(eventId, cancellerId, {
        status: EventStatus.CANCELLED
      });

      const response: ApiResponse = {
        success: true,
        message: 'Event cancelled successfully',
        data: { event }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel event'
      };
      res.status(400).json(response);
    }
  }
}
