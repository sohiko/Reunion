import { prisma } from '../utils/prisma';
import { FileUploadService } from './fileUploadService';
import { UUIDUtil } from '@reunion/shared';
import { config } from '../config';
import {
  AccountStatus
} from '@reunion/shared';
import { VerificationDocument, VerificationDocumentStatus } from '@prisma/client';

export class VerificationService {
  private fileUploadService: FileUploadService;

  constructor() {
    this.fileUploadService = new FileUploadService();
  }

  /**
   * 身分証明書をアップロード
   */
  async uploadVerificationDocument(
    userId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<VerificationDocument> {
    // ファイル検証
    if (!FileUploadService.validateMimeType(mimeType)) {
      throw new Error('Unsupported file type. Only JPEG, PNG, and PDF are allowed.');
    }

    if (!FileUploadService.validateFileSize(fileBuffer.length)) {
      throw new Error('File size exceeds the maximum limit of 5MB.');
    }

    if (!FileUploadService.validateFileContent(fileBuffer, mimeType)) {
      throw new Error('Invalid file content.');
    }

    // 既存の未処理の身分証明書をチェック
    const existingDocument = await prisma.verificationDocument.findFirst({
      where: {
        user_id: userId,
        status: {
          in: [VerificationDocumentStatus.UPLOADED, VerificationDocumentStatus.PENDING_REVIEW]
        }
      }
    });

    if (existingDocument) {
      throw new Error('A verification document is already being processed. Please wait for approval or contact support.');
    }

    // ファイルをアップロード
    const { filePath } = await this.fileUploadService.uploadFile(
      fileBuffer,
      originalFilename,
      mimeType,
      userId
    );

    // データベースに記録
    const document = await prisma.verificationDocument.create({
      data: {
        id: UUIDUtil.generate(),
        user_id: userId,
        file_path: filePath,
        original_filename: originalFilename,
        status: VerificationDocumentStatus.UPLOADED,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90日後
      }
    });

    // ステータスを審査待ちに更新
    const updatedDocument = await prisma.verificationDocument.update({
      where: { id: document.id },
      data: { status: VerificationDocumentStatus.PENDING_REVIEW }
    });

    return updatedDocument;
  }

  /**
   * 身分証明書を取得（署名付きURL付き）
   */
  async getVerificationDocument(documentId: string, reviewerId?: string): Promise<VerificationDocument & { signedUrl?: string }> {
    const document = await prisma.verificationDocument.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                name_sei: true,
                name_mei: true,
                graduation_year: true,
              }
            }
          }
        }
      }
    });

    if (!document) {
      throw new Error('Verification document not found');
    }

    // 審査済みまたは削除済みの場合はURLを発行しない
    if (document.status === VerificationDocumentStatus.APPROVED ||
        document.status === VerificationDocumentStatus.REJECTED ||
        document.status === VerificationDocumentStatus.DELETED) {
      return document;
    }

    // 署名付きURLを生成（5分間有効）
    const signedUrl = await this.fileUploadService.generateSignedUrl(document.file_path, 300);

    return {
      ...document,
      signedUrl,
    };
  }

  /**
   * 審査待ちの身分証明書一覧を取得
   */
  async getPendingDocuments(): Promise<VerificationDocument[]> {
    return prisma.verificationDocument.findMany({
      where: {
        status: VerificationDocumentStatus.PENDING_REVIEW
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                name_sei: true,
                name_mei: true,
                graduation_year: true,
              }
            }
          }
        }
      },
      orderBy: { uploaded_at: 'asc' }
    });
  }

  /**
   * 身分証明書を審査（承認・拒否）
   */
  async reviewDocument(
    documentId: string,
    reviewerId: string,
    action: 'approve' | 'reject',
    reviewerNotes?: string
  ): Promise<VerificationDocument> {
    const document = await prisma.verificationDocument.findUnique({
      where: { id: documentId },
      include: { user: true }
    });

    if (!document) {
      throw new Error('Verification document not found');
    }

    if (document.status !== VerificationDocumentStatus.PENDING_REVIEW) {
      throw new Error('Document is not in pending review status');
    }

    const newStatus = action === 'approve'
      ? VerificationDocumentStatus.APPROVED
      : VerificationDocumentStatus.REJECTED;

    // ドキュメントを更新
    const updatedDocument = await prisma.verificationDocument.update({
      where: { id: documentId },
      data: {
        status: newStatus,
        reviewed_at: new Date(),
        reviewed_by: reviewerId,
        reviewer_notes: reviewerNotes,
      }
    });

    // 承認された場合はユーザーアカウントをアクティブ化
    if (action === 'approve') {
      await prisma.user.update({
        where: { id: document.user_id },
        data: { status: AccountStatus.ACTIVE }
      });

      // 承認後30日でファイルを削除するようスケジュール
      setTimeout(async () => {
        try {
          await this.deleteExpiredDocument(documentId);
        } catch (error) {
          console.error('Failed to delete approved verification document:', error);
        }
      }, 30 * 24 * 60 * 60 * 1000); // 30日
    }

    return updatedDocument;
  }

  /**
   * 期限切れの身分証明書を削除
   */
  async deleteExpiredDocument(documentId: string): Promise<void> {
    const document = await prisma.verificationDocument.findUnique({
      where: { id: documentId }
    });

    if (!document) return;

    // 承認済みのドキュメントのみ削除
    if (document.status === VerificationDocumentStatus.APPROVED) {
      await this.fileUploadService.deleteFile(document.file_path);

      await prisma.verificationDocument.update({
        where: { id: documentId },
        data: { status: VerificationDocumentStatus.DELETED }
      });
    }
  }

  /**
   * 期限切れの身分証明書を一括削除（定期実行用）
   */
  async cleanupExpiredDocuments(): Promise<number> {
    const expiredDocuments = await prisma.verificationDocument.findMany({
      where: {
        status: VerificationDocumentStatus.APPROVED,
        expires_at: {
          lt: new Date()
        }
      }
    });

    let deletedCount = 0;
    for (const document of expiredDocuments) {
      try {
        await this.deleteExpiredDocument(document.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete document ${document.id}:`, error);
      }
    }

    return deletedCount;
  }

  /**
   * ユーザーの身分証明書を取得
   */
  async getUserVerificationDocuments(userId: string): Promise<VerificationDocument[]> {
    return prisma.verificationDocument.findMany({
      where: { user_id: userId },
      orderBy: { uploaded_at: 'desc' }
    });
  }
}
