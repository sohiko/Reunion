import { Request, Response } from 'express';
import { MessageService, CreateMessageData } from '../services/messageService';
import { ApiResponse, MessageType } from '@reunion/shared';
import { auditLog } from '../middleware/audit';
import { AuditActionType } from '@reunion/shared';

const messageService = new MessageService();

export class MessageController {
  /**
   * メッセージを送信
   */
  static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const messageData: CreateMessageData = req.body;
      const senderId = req.user!.user_id;

      const message = await messageService.sendMessage(senderId, messageData);

      const response: ApiResponse = {
        success: true,
        message: 'Message sent successfully',
        data: { message }
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      };
      res.status(400).json(response);
    }
  }

  /**
   * 一斉メッセージを送信
   */
  static async sendBulkMessage(req: Request, res: Response): Promise<void> {
    try {
      const { target_user_ids, target_graduation_years, is_all_graduates, content } = req.body;
      const senderId = req.user!.user_id;

      let targetIds: string[] = [];

      if (target_user_ids && target_user_ids.length > 0) {
        // 指定されたユーザーID一覧
        targetIds = target_user_ids;
      } else {
        // 卒業年または全体指定
        targetIds = await messageService.getTargetUsersForBulkMessage(
          senderId,
          target_graduation_years,
          is_all_graduates
        );
      }

      if (targetIds.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'No target users found'
        };
        return res.status(400).json(response);
      }

      const messages = await messageService.sendBulkMessage(
        senderId,
        targetIds,
        content,
        MessageType.ANNOUNCEMENT
      );

      const response: ApiResponse = {
        success: true,
        message: `Bulk message sent to ${messages.length} users`,
        data: {
          sent_count: messages.length,
          total_targets: targetIds.length
        }
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send bulk message'
      };
      res.status(400).json(response);
    }
  }

  /**
   * メッセージを取得
   */
  static async getMessage(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const userId = req.user!.user_id;

      const message = await messageService.getMessage(messageId, userId);

      if (!message) {
        const response: ApiResponse = {
          success: false,
          error: 'Message not found or access denied'
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: { message }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch message'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 会話のメッセージ一覧を取得
   */
  static async getConversationMessages(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.user_id;

      const messages = await messageService.getConversationMessages(conversationId, userId);

      const response: ApiResponse = {
        success: true,
        data: { messages }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch conversation messages'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 受信メッセージ一覧を取得
   */
  static async getReceivedMessages(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.user_id;
      const { page = '1', limit = '20' } = req.query;

      const result = await messageService.getReceivedMessages(
        userId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      const response: ApiResponse = {
        success: true,
        data: {
          messages: result.messages,
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
        error: error instanceof Error ? error.message : 'Failed to fetch received messages'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 送信メッセージ一覧を取得
   */
  static async getSentMessages(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.user_id;
      const { page = '1', limit = '20' } = req.query;

      const result = await messageService.getSentMessages(
        userId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      const response: ApiResponse = {
        success: true,
        data: {
          messages: result.messages,
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
        error: error instanceof Error ? error.message : 'Failed to fetch sent messages'
      };
      res.status(500).json(response);
    }
  }

  /**
   * メッセージを既読にする
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const userId = req.user!.user_id;

      await messageService.markAsRead(messageId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Message marked as read'
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark message as read'
      };
      res.status(400).json(response);
    }
  }

  /**
   * メッセージを削除
   */
  static async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const userId = req.user!.user_id;

      await messageService.deleteMessage(messageId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Message deleted successfully'
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete message'
      };
      res.status(400).json(response);
    }
  }

  /**
   * 未読メッセージ数を取得
   */
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.user_id;
      const count = await messageService.getUnreadCount(userId);

      const response: ApiResponse = {
        success: true,
        data: { unread_count: count }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get unread count'
      };
      res.status(500).json(response);
    }
  }
}
