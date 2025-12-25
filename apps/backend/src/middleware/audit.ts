import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService';
import { AuditActionType } from '@reunion/shared';

/**
 * 監査ログ記録ミドルウェア
 */
export const auditLog = (action: AuditActionType, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    let responseBody: any = null;

    // レスポンスをキャプチャ
    res.send = function(data) {
      responseBody = data;
      return originalSend.call(this, data);
    };

    // レスポンス送信後にログを記録
    res.on('finish', async () => {
      try {
        const userId = req.user?.user_id;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';

        // リソースIDの取得（URLパラメータやボディから）
        let resourceId: string | undefined;
        if (req.params.id) {
          resourceId = req.params.id;
        } else if (req.body?.id) {
          resourceId = req.body.id;
        }

        // 詳細情報の構築
        const details: Record<string, any> = {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
        };

        // 機密情報のマスク化
        if (req.body && typeof req.body === 'object') {
          const maskedBody = { ...req.body };
          if (maskedBody.password) maskedBody.password = '[REDACTED]';
          if (maskedBody.password_hash) maskedBody.password_hash = '[REDACTED]';
          details.requestBody = maskedBody;
        }

        if (responseBody && typeof responseBody === 'string') {
          try {
            const parsed = JSON.parse(responseBody);
            if (parsed.password) parsed.password = '[REDACTED]';
            if (parsed.password_hash) parsed.password_hash = '[REDACTED]';
            details.responseBody = parsed;
          } catch {
            // JSONパース失敗時はそのまま
          }
        }

        // 承認が必要な操作かどうか
        const requiresApproval = isApprovalRequired(action, resourceType, req);

        await AuditService.log(
          userId,
          action,
          resourceType,
          resourceId,
          details,
          ipAddress,
          userAgent,
          requiresApproval
        );
      } catch (error) {
        // ログ記録の失敗はアプリケーションの実行を妨げない
        console.error('Audit logging failed:', error);
      }
    });

    next();
  };
};

/**
 * 承認が必要な操作かどうかを判定
 */
function isApprovalRequired(action: AuditActionType, resourceType: string, req: Request): boolean {
  // 全学年検索は常に承認が必要
  if (action === AuditActionType.SEARCH && resourceType === 'USER' && req.query.allGrades === 'true') {
    return true;
  }

  // データエクスポートは承認が必要
  if (action === AuditActionType.EXPORT) {
    return true;
  }

  // ユーザーの削除は承認が必要
  if (action === AuditActionType.DELETE && resourceType === 'USER') {
    return true;
  }

  return false;
}

/**
 * バルク操作の監査ログ記録
 */
export const auditBulkLog = (action: AuditActionType, resourceType: string, count: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function(data) {
      return originalSend.call(this, data);
    };

    res.on('finish', async () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const userId = req.user?.user_id;
          const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
          const userAgent = req.get('User-Agent') || 'unknown';

          await AuditService.log(
            userId,
            action,
            resourceType,
            undefined,
            {
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode,
              bulkOperation: true,
              affectedCount: count,
            },
            ipAddress,
            userAgent,
            false
          );
        }
      } catch (error) {
        console.error('Bulk audit logging failed:', error);
      }
    });

    next();
  };
};
