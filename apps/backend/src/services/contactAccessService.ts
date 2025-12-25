import { prisma } from '../utils/prisma';
import { EmailService } from './emailService';
import { UUIDUtil } from '@reunion/shared';
import { ContactType } from '@reunion/shared';
import { ContactAccessRequest, ContactAccessStatus } from '@prisma/client';

export class ContactAccessService {
  /**
   * 連絡先開示許可申請を作成
   */
  async createContactAccessRequest(
    requesterId: string,
    targetId: string,
    requestedContactTypes: ContactType[],
    reason: string
  ): Promise<ContactAccessRequest> {
    // 自分自身への申請は無効
    if (requesterId === targetId) {
      throw new Error('Cannot request access to your own contact information');
    }

    // 対象ユーザーの存在確認
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      include: { profile: true }
    });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // ブロックされているかチェック
    const existingBlockedRequest = await prisma.contactAccessRequest.findFirst({
      where: {
        requester_id: requesterId,
        target_id: targetId,
        block_future_requests: true,
      }
    });

    if (existingBlockedRequest) {
      throw new Error('You have been blocked from requesting contact information from this user');
    }

    // 保留中の申請がないかチェック
    const existingPendingRequest = await prisma.contactAccessRequest.findFirst({
      where: {
        requester_id: requesterId,
        target_id: targetId,
        status: ContactAccessStatus.PENDING,
      }
    });

    if (existingPendingRequest) {
      throw new Error('You already have a pending request to this user');
    }

    // 申請作成
    const request = await prisma.contactAccessRequest.create({
      data: {
        id: UUIDUtil.generate(),
        requester_id: requesterId,
        target_id: targetId,
        status: ContactAccessStatus.PENDING,
        requested_contact_types: requestedContactTypes,
        reason,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
      }
    });

    // メール通知を送信（実装済みの場合）
    try {
      await this.sendNotificationEmail(request.id);
    } catch (error) {
      console.error('Failed to send notification email:', error);
      // メール送信失敗は申請作成をブロックしない
    }

    return request;
  }

  /**
   * 連絡先アクセスリクエストを取得
   */
  async getContactAccessRequest(requestId: string, userId: string): Promise<ContactAccessRequest | null> {
    const request = await prisma.contactAccessRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: {
            id: true,
            profile: {
              select: {
                name_sei: true,
                name_mei: true,
                graduation_year: true,
              }
            }
          }
        },
        target: {
          select: {
            id: true,
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

    if (!request) return null;

    // 申請者または対象者以外はアクセス不可
    if (request.requester_id !== userId && request.target_id !== userId) {
      return null;
    }

    return request;
  }

  /**
   * 受信した連絡先アクセスリクエスト一覧を取得
   */
  async getReceivedRequests(userId: string): Promise<ContactAccessRequest[]> {
    return prisma.contactAccessRequest.findMany({
      where: {
        target_id: userId,
        status: ContactAccessStatus.PENDING,
        expires_at: {
          gt: new Date()
        }
      },
      include: {
        requester: {
          select: {
            id: true,
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
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * 送信した連絡先アクセスリクエスト一覧を取得
   */
  async getSentRequests(userId: string): Promise<ContactAccessRequest[]> {
    return prisma.contactAccessRequest.findMany({
      where: {
        requester_id: userId,
      },
      include: {
        target: {
          select: {
            id: true,
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

  /**
   * 連絡先アクセスリクエストを承認・拒否
   */
  async respondToRequest(
    requestId: string,
    userId: string,
    action: 'approve' | 'reject',
    approvedContactTypes?: ContactType[],
    blockFutureRequests: boolean = false
  ): Promise<ContactAccessRequest> {
    const request = await prisma.contactAccessRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.target_id !== userId) {
      throw new Error('You are not authorized to respond to this request');
    }

    if (request.status !== ContactAccessStatus.PENDING) {
      throw new Error('Request has already been processed');
    }

    const newStatus = action === 'approve'
      ? ContactAccessStatus.APPROVED
      : ContactAccessStatus.REJECTED;

    const updatedRequest = await prisma.contactAccessRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        respondent_response_at: new Date(),
        block_future_requests: blockFutureRequests,
      }
    });

    // 承認された場合、連絡先アクセスログを作成
    if (action === 'approve' && approvedContactTypes) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });

      if (targetUser) {
        for (const contactType of approvedContactTypes) {
          await prisma.contactAccessLog.create({
            data: {
              id: UUIDUtil.generate(),
              viewer_id: request.requester_id,
              subject_id: userId,
              access_type: 'DIRECT_VIEW',
              contact_type: contactType,
              access_method: 'WEB_VIEW',
              access_granted_by: userId,
              ip_address: 'system', // TODO: リクエストから取得
              user_agent: 'system',
            }
          });
        }
      }
    }

    return updatedRequest;
  }

  /**
   * 連絡先情報を取得（承認済みの場合のみ）
   */
  async getApprovedContactInfo(viewerId: string, subjectId: string): Promise<{
    email?: string;
    phone_number?: string;
    address?: string;
  }> {
    // 承認済みのアクセスログを確認
    const approvedLogs = await prisma.contactAccessLog.findMany({
      where: {
        viewer_id: viewerId,
        subject_id: subjectId,
        created_at: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1年以内
        }
      }
    });

    if (approvedLogs.length === 0) {
      throw new Error('No approved access to this user\'s contact information');
    }

    // 対象ユーザーの連絡先情報を取得
    const userProfile = await prisma.profile.findUnique({
      where: { id: subjectId }
    });

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const contactInfo: any = {};

    // 承認された連絡先種別のみ返す
    const approvedTypes = approvedLogs.map((log: any) => log.contact_type);

    if (approvedTypes.includes(ContactType.EMAIL) && userProfile.email) {
      contactInfo.email = userProfile.email;
    }

    if (approvedTypes.includes(ContactType.PHONE) && userProfile.phone_number) {
      contactInfo.phone_number = userProfile.phone_number;
    }

    if (approvedTypes.includes(ContactType.ADDRESS) && userProfile.address) {
      contactInfo.address = userProfile.address;
    }

    return contactInfo;
  }

  /**
   * 通知メールを送信
   */
  private async sendNotificationEmail(requestId: string): Promise<void> {
    const request = await prisma.contactAccessRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: {
            id: true,
            profile: {
              select: {
                name_sei: true,
                name_mei: true,
                graduation_year: true,
              }
            }
          }
        },
        target: {
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

    if (!request || !request.target.email) return;

    const subject = '同窓会アプリ：連絡先開示許可申請のお知らせ';
    const html = `
      <h2>連絡先開示許可申請のお知らせ</h2>
      <p>${request.requester.profile?.name_sei} ${request.requester.profile?.name_mei}さん（${request.requester.profile?.graduation_year}年度卒業）から、連絡先情報の開示許可を申請されました。</p>

      <h3>申請内容</h3>
      <ul>
        ${request.requested_contact_types.map((type: any) => `<li>${this.getContactTypeDisplayName(type)}</li>`).join('')}
      </ul>

      <h3>申請理由</h3>
      <p>${request.reason}</p>

      <p>以下のリンクから承認・拒否を行ってください：</p>
      <p><a href="${process.env.FRONTEND_URL}/contact-requests/${requestId}">リクエストを確認する</a></p>

      <p>このメールは自動送信されています。</p>
    `;

    // EmailServiceが実装済みの場合に送信
    try {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: request.target.email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send notification email:', error);
    }
  }

  /**
   * 連絡先種別の表示名を取得
   */
  private getContactTypeDisplayName(type: ContactType): string {
    switch (type) {
      case ContactType.EMAIL:
        return 'メールアドレス';
      case ContactType.PHONE:
        return '電話番号';
      case ContactType.ADDRESS:
        return '住所';
      default:
        return type;
    }
  }

  /**
   * 期限切れのリクエストをクリーンアップ
   */
  async cleanupExpiredRequests(): Promise<number> {
    const result = await prisma.contactAccessRequest.updateMany({
      where: {
        status: ContactAccessStatus.PENDING,
        expires_at: {
          lt: new Date()
        }
      },
      data: {
        status: ContactAccessStatus.EXPIRED
      }
    });

    return result.count;
  }
}
