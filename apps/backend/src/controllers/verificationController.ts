import { Request, Response } from 'express';
import multer from 'multer';
import { VerificationService } from '../services/verificationService';
import { ApiResponse } from '@reunion/shared';

const verificationService = new VerificationService();

// Multer設定（メモリに一時保存）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
    }
  },
});

export class VerificationController {
  /**
   * 身分証明書をアップロード
   */
  static async uploadVerificationDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.user_id;
      const file = req.file;

      if (!file) {
        const response: ApiResponse = {
          success: false,
          error: 'No file uploaded'
        };
        res.status(400).json(response);
      }

      if (!file) {
        const response: ApiResponse = {
          success: false,
          error: 'No file uploaded'
        };
        res.status(400).json(response);
      }

      const document = await verificationService.uploadVerificationDocument(
        userId,
        file.buffer,
        file.originalname,
        file.mimetype
      );

      const response: ApiResponse = {
        success: true,
        message: 'Verification document uploaded successfully. It will be reviewed by an officer.',
        data: {
          document: {
            id: document.id,
            status: document.status,
            uploaded_at: document.uploaded_at,
          }
        }
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
      res.status(400).json(response);
    }
  }

  /**
   * 審査待ちの身分証明書一覧を取得（役員専用）
   */
  static async getPendingDocuments(req: Request, res: Response): Promise<void> {
    try {
      const documents = await verificationService.getPendingDocuments();

      const response: ApiResponse = {
        success: true,
        data: {
          documents: documents.map(doc => ({
            id: doc.id,
            user_id: doc.user_id,
            user: (doc as any).user,
            status: doc.status,
            uploaded_at: doc.uploaded_at,
            original_filename: doc.original_filename,
          }))
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pending documents'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 身分証明書を取得（署名付きURL付き）
   */
  static async getVerificationDocument(req: Request, res: Response): Promise<void> {
    try {
      const { documentId } = req.params;
      const reviewerId = req.user?.user_id;

      const document = await verificationService.getVerificationDocument(documentId, reviewerId) as any;

      const response: ApiResponse = {
        success: true,
        data: {
          document: {
            id: document.id,
            user_id: document.user_id,
            user: document.user,
            status: document.status,
            uploaded_at: document.uploaded_at,
            reviewed_at: document.reviewed_at,
            reviewed_by: document.reviewed_by,
            reviewer_notes: document.reviewer_notes,
            signed_url: document.signedUrl,
          }
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch verification document'
      };
      res.status(404).json(response);
    }
  }

  /**
   * 身分証明書を審査（承認・拒否）
   */
  static async reviewDocument(req: Request, res: Response): Promise<void> {
    try {
      const { documentId } = req.params;
      const { action, reviewer_notes } = req.body;
      const reviewerId = req.user!.user_id;

      if (!['approve', 'reject'].includes(action)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid action. Must be "approve" or "reject".'
        };
        res.status(400).json(response);
      }

      const document = await verificationService.reviewDocument(
        documentId,
        reviewerId,
        action,
        reviewer_notes
      );

      const response: ApiResponse = {
        success: true,
        message: `Verification document ${action}d successfully`,
        data: {
          document: {
            id: document.id,
            status: document.status,
            reviewed_at: document.reviewed_at,
            reviewed_by: document.reviewed_by,
            reviewer_notes: document.reviewer_notes,
          }
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Review failed'
      };
      res.status(400).json(response);
    }
  }

  /**
   * ユーザーの身分証明書一覧を取得
   */
  static async getUserVerificationDocuments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || req.user!.user_id;

      const documents = await verificationService.getUserVerificationDocuments(userId);

      const response: ApiResponse = {
        success: true,
        data: {
          documents: documents.map(doc => ({
            id: doc.id,
            status: doc.status,
            uploaded_at: doc.uploaded_at,
            reviewed_at: doc.reviewed_at,
            reviewer_notes: doc.reviewer_notes,
          }))
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user verification documents'
      };
      res.status(500).json(response);
    }
  }

  // Multerミドルウェア
  static uploadMiddleware = upload.single('verification_document');
}
