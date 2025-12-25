import { Request, Response } from 'express';
import { ContactAccessService } from '../services/contactAccessService';
import { ApiResponse, ContactType } from '@reunion/shared';
import { auditLog } from '../middleware/audit';
import { AuditActionType } from '@reunion/shared';

const contactAccessService = new ContactAccessService();

export class ContactAccessController {
  /**
   * 連絡先開示許可申請を作成
   */
  static async createContactAccessRequest(req: Request, res: Response): Promise<void> {
    try {
      const { target_id, requested_contact_types, reason } = req.body;
      const requesterId = req.user!.user_id;

      const request = await contactAccessService.createContactAccessRequest(
        requesterId,
        target_id,
        requested_contact_types,
        reason
      );

      const response: ApiResponse = {
        success: true,
        message: 'Contact access request created successfully',
        data: {
          request: {
            id: request.id,
            status: request.status,
            requested_contact_types: request.requested_contact_types,
            reason: request.reason,
            created_at: request.created_at,
          }
        }
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create request'
      };
      res.status(400).json(response);
    }
  }

  /**
   * 連絡先アクセスリクエストを取得
   */
  static async getContactAccessRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = req.user!.user_id;

      const request = await contactAccessService.getContactAccessRequest(requestId, userId);

      if (!request) {
        const response: ApiResponse = {
          success: false,
          error: 'Request not found or access denied'
        };
        res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: { request }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch request'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 受信した連絡先アクセスリクエスト一覧を取得
   */
  static async getReceivedRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.user_id;
      const requests = await contactAccessService.getReceivedRequests(userId);

      const response: ApiResponse = {
        success: true,
        data: { requests }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch received requests'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 送信した連絡先アクセスリクエスト一覧を取得
   */
  static async getSentRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.user_id;
      const requests = await contactAccessService.getSentRequests(userId);

      const response: ApiResponse = {
        success: true,
        data: { requests }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sent requests'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 連絡先アクセスリクエストを承認・拒否
   */
  static async respondToRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const { action, approved_contact_types, block_future_requests } = req.body;
      const userId = req.user!.user_id;

      if (!['approve', 'reject'].includes(action)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid action. Must be "approve" or "reject".'
        };
        res.status(400).json(response);
      }

      const request = await contactAccessService.respondToRequest(
        requestId,
        userId,
        action,
        approved_contact_types,
        block_future_requests
      );

      const response: ApiResponse = {
        success: true,
        message: `Request ${action}d successfully`,
        data: {
          request: {
            id: request.id,
            status: request.status,
            respondent_response_at: request.respondent_response_at,
          }
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to respond to request'
      };
      res.status(400).json(response);
    }
  }

  /**
   * 承認済みの連絡先情報を取得
   */
  static async getApprovedContactInfo(req: Request, res: Response): Promise<void> {
    try {
      const { subjectId } = req.params;
      const viewerId = req.user!.user_id;

      const contactInfo = await contactAccessService.getApprovedContactInfo(viewerId, subjectId);

      const response: ApiResponse = {
        success: true,
        data: { contact_info: contactInfo }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch contact information'
      };
      res.status(400).json(response);
    }
  }
}
