import { prisma } from '../utils/prisma';
import { UUIDUtil } from '@reunion/shared';
import {
  ApprovalStatus
} from '@reunion/shared';
import { AuditLog, AuditActionType } from '@prisma/client';

export class AuditService {
  /**
   * 監査ログの記録
   */
  static async log(
    userId: string | undefined,
    action: AuditActionType,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
    requiresApproval: boolean = false
  ): Promise<AuditLog> {
    const auditLog = await prisma.auditLog.create({
      data: {
        id: UUIDUtil.generate(),
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
        ip_address: ipAddress || 'unknown',
        user_agent: userAgent || 'unknown',
        requires_approval: requiresApproval,
        approval_status: requiresApproval ? ApprovalStatus.PENDING : ApprovalStatus.NOT_REQUIRED,
      }
    });

    return auditLog;
  }

  /**
   * ログの承認処理
   */
  static async approveLog(
    logId: string,
    approverId: string,
    approved: boolean,
    reason?: string
  ): Promise<AuditLog> {
    const auditLog = await prisma.auditLog.update({
      where: { id: logId },
      data: {
        approval_status: approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        approved_by: approverId,
        approved_at: new Date(),
        details: {
          approval_reason: reason,
        }
      }
    });

    return auditLog;
  }

  /**
   * ログの検索
   */
  static async searchLogs(
    filters: {
      userId?: string;
      action?: AuditActionType;
      resourceType?: string;
      resourceId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      approvalStatus?: ApprovalStatus;
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{ logs: AuditLog[]; total: number; totalPages: number }> {
    const where: any = {};

    if (filters.userId) where.user_id = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.resourceType) where.resource_type = filters.resourceType;
    if (filters.resourceId) where.resource_id = filters.resourceId;
    if (filters.approvalStatus) where.approval_status = filters.approvalStatus;

    if (filters.dateFrom || filters.dateTo) {
      where.created_at = {};
      if (filters.dateFrom) where.created_at.gte = filters.dateFrom;
      if (filters.dateTo) where.created_at.lte = filters.dateTo;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  name_sei: true,
                  name_mei: true,
                }
              }
            }
          },
          approver: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  name_sei: true,
                  name_mei: true,
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 保留中の承認待ちログを取得
   */
  static async getPendingApprovals(): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: {
        requires_approval: true,
        approval_status: ApprovalStatus.PENDING
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
              }
            }
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });
  }

  /**
   * ユーザーの最近のログを取得
   */
  static async getUserRecentLogs(userId: string, limit: number = 10): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        approver: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                name_sei: true,
                name_mei: true,
              }
            }
          }
        }
      }
    });
  }

  /**
   * 統計情報の取得
   */
  static async getAuditStats(
    dateFrom: Date,
    dateTo: Date
  ): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByResourceType: Record<string, number>;
    pendingApprovals: number;
  }> {
    const [totalLogs, actionStats, resourceStats, pendingCount] = await Promise.all([
      prisma.auditLog.count({
        where: {
          created_at: {
            gte: dateFrom,
            lte: dateTo,
          }
        }
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          created_at: {
            gte: dateFrom,
            lte: dateTo,
          }
        },
        _count: {
          action: true,
        }
      }),
      prisma.auditLog.groupBy({
        by: ['resource_type'],
        where: {
          created_at: {
            gte: dateFrom,
            lte: dateTo,
          }
        },
        _count: {
          resource_type: true,
        }
      }),
      prisma.auditLog.count({
        where: {
          requires_approval: true,
          approval_status: ApprovalStatus.PENDING,
          created_at: {
            gte: dateFrom,
            lte: dateTo,
          }
        }
      })
    ]);

    const logsByAction = actionStats.reduce((acc: Record<string, number>, stat: any) => {
      acc[stat.action] = stat._count.action;
      return acc;
    }, {});

    const logsByResourceType = resourceStats.reduce((acc: Record<string, number>, stat: any) => {
      acc[stat.resource_type] = stat._count.resource_type;
      return acc;
    }, {});

    return {
      totalLogs,
      logsByAction,
      logsByResourceType,
      pendingApprovals: pendingCount,
    };
  }

  /**
   * ログのエクスポート
   */
  static async exportLogs(
    filters: {
      userId?: string;
      action?: AuditActionType;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<AuditLog[]> {
    const where: any = {};

    if (filters.userId) where.user_id = filters.userId;
    if (filters.action) where.action = filters.action;

    if (filters.dateFrom || filters.dateTo) {
      where.created_at = {};
      if (filters.dateFrom) where.created_at.gte = filters.dateFrom;
      if (filters.dateTo) where.created_at.lte = filters.dateTo;
    }

    return prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                name_sei: true,
                name_mei: true,
              }
            }
          }
        },
        approver: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                name_sei: true,
                name_mei: true,
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }
}
