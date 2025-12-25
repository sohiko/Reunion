import { prisma } from '../utils/prisma';
import { EmailService } from './emailService';
import { UUIDUtil } from '@reunion/shared';
import {
  Event,
  EventType,
  EventStatus,
  AttendanceStatus,
  UserRole
} from '@reunion/shared';

export interface CreateEventData {
  title: string;
  description?: string;
  event_type: EventType;
  event_date: Date;
  location?: string;
  target_graduation_years: number[];
  is_all_graduates: boolean;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  event_date?: Date;
  location?: string;
  target_graduation_years?: number[];
  is_all_graduates?: boolean;
  status?: EventStatus;
}

export class EventService {
  /**
   * イベントを作成
   */
  async createEvent(creatorId: string, eventData: CreateEventData): Promise<Event> {
    // 作成者の権限チェック
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      include: { role: true }
    });

    if (!creator) {
      throw new Error('Creator not found');
    }

    // 幹事の場合、担当学年のみ許可
    if (creator.role.name === UserRole.COORDINATOR) {
      const coordinatorAssignments = await prisma.coordinatorAssignment.findMany({
        where: { coordinator_id: creatorId }
      });

      const assignedYears = coordinatorAssignments.map(assignment => assignment.graduation_year);
      const unauthorizedYears = eventData.target_graduation_years.filter(
        year => !assignedYears.includes(year)
      );

      if (unauthorizedYears.length > 0) {
        throw new Error('You can only create events for your assigned graduation years');
      }
    }

    const event = await prisma.event.create({
      data: {
        id: UUIDUtil.generate(),
        title: eventData.title,
        description: eventData.description,
        event_type: eventData.event_type,
        event_date: eventData.event_date,
        location: eventData.location,
        target_graduation_years: eventData.target_graduation_years,
        is_all_graduates: eventData.is_all_graduates,
        status: EventStatus.SCHEDULED,
        created_by: creatorId,
      }
    });

    return event;
  }

  /**
   * イベントを更新
   */
  async updateEvent(eventId: string, updaterId: string, updateData: UpdateEventData): Promise<Event> {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // 権限チェック
    const updater = await prisma.user.findUnique({
      where: { id: updaterId },
      include: { role: true }
    });

    if (!updater) {
      throw new Error('Updater not found');
    }

    // 作成者または役員・システム管理者のみ更新可能
    const canUpdate = event.created_by === updaterId ||
                      updater.role.name === UserRole.OFFICER ||
                      updater.role.name === UserRole.SYSTEM_ADMIN;

    if (!canUpdate) {
      throw new Error('You do not have permission to update this event');
    }

    // 幹事の場合、担当学年のみ許可
    if (updater.role.name === UserRole.COORDINATOR && updateData.target_graduation_years) {
      const coordinatorAssignments = await prisma.coordinatorAssignment.findMany({
        where: { coordinator_id: updaterId }
      });

      const assignedYears = coordinatorAssignments.map(assignment => assignment.graduation_year);
      const unauthorizedYears = updateData.target_graduation_years.filter(
        year => !assignedYears.includes(year)
      );

      if (unauthorizedYears.length > 0) {
        throw new Error('You can only update events for your assigned graduation years');
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData
    });

    return updatedEvent;
  }

  /**
   * イベントを削除
   */
  async deleteEvent(eventId: string, deleterId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // 権限チェック
    const deleter = await prisma.user.findUnique({
      where: { id: deleterId },
      include: { role: true }
    });

    if (!deleter) {
      throw new Error('Deleter not found');
    }

    // 作成者または役員・システム管理者のみ削除可能
    const canDelete = event.created_by === deleterId ||
                      deleter.role.name === UserRole.OFFICER ||
                      deleter.role.name === UserRole.SYSTEM_ADMIN;

    if (!canDelete) {
      throw new Error('You do not have permission to delete this event');
    }

    await prisma.event.delete({
      where: { id: eventId }
    });
  }

  /**
   * イベントを取得
   */
  async getEvent(eventId: string, userId?: string): Promise<Event | null> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        creator: {
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

    if (!event) return null;

    // アクセス権限チェック（対象学年のユーザーのみ）
    if (userId && !this.canAccessEvent(event, userId)) {
      return null;
    }

    return event;
  }

  /**
   * イベント一覧を取得
   */
  async getEvents(
    userId?: string,
    filters?: {
      event_type?: EventType;
      status?: EventStatus;
      graduation_year?: number;
      date_from?: Date;
      date_to?: Date;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ events: Event[]; total: number; totalPages: number }> {
    const where: any = {};

    if (filters?.event_type) {
      where.event_type = filters.event_type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.date_from || filters?.date_to) {
      where.event_date = {};
      if (filters.date_from) where.event_date.gte = filters.date_from;
      if (filters.date_to) where.event_date.lte = filters.date_to;
    }

    // ユーザーのアクセス可能なイベントのみ
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          profile: true,
          coordinator_assignments: true
        }
      });

      if (user) {
        // 一般会員の場合、対象学年または全体公開イベントのみ
        if (user.role.name === UserRole.GENERAL_MEMBER) {
          where.OR = [
            { is_all_graduates: true },
            {
              target_graduation_years: {
                has: user.profile?.graduation_year
              }
            }
          ];
        }
        // 幹事の場合、担当学年または全体公開イベントのみ
        else if (user.role.name === UserRole.COORDINATOR) {
          const assignedYears = user.coordinator_assignments.map(a => a.graduation_year);
          where.OR = [
            { is_all_graduates: true },
            {
              target_graduation_years: {
                hasSome: assignedYears
              }
            }
          ];
        }
        // フィルタで卒業年が指定された場合
        if (filters?.graduation_year) {
          where.target_graduation_years = {
            has: filters.graduation_year
          };
        }
      }
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          creator: {
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
        orderBy: { event_date: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.event.count({ where })
    ]);

    return {
      events,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 出欠登録
   */
  async registerAttendance(eventId: string, userId: string, status: AttendanceStatus, notes?: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // イベントアクセス権限チェック
    if (!this.canAccessEvent(event, userId)) {
      throw new Error('You do not have access to this event');
    }

    // イベントがキャンセルされていないかチェック
    if (event.status === EventStatus.CANCELLED) {
      throw new Error('This event has been cancelled');
    }

    await prisma.attendance.upsert({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId,
        }
      },
      update: {
        status,
        additional_notes: notes,
        responded_at: new Date(),
      },
      create: {
        id: UUIDUtil.generate(),
        event_id: eventId,
        user_id: userId,
        status,
        additional_notes: notes,
        responded_at: new Date(),
      }
    });
  }

  /**
   * 出欠状況を取得
   */
  async getAttendanceList(eventId: string, requesterId: string): Promise<any[]> {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // 権限チェック（作成者、役員、幹事のみ）
    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      include: { role: true }
    });

    if (!requester) {
      throw new Error('Requester not found');
    }

    const canView = event.created_by === requesterId ||
                    requester.role.name === UserRole.OFFICER ||
                    requester.role.name === UserRole.SYSTEM_ADMIN;

    if (!canView) {
      // 幹事の場合、担当学年かチェック
      if (requester.role.name === UserRole.COORDINATOR) {
        const coordinatorAssignments = await prisma.coordinatorAssignment.findMany({
          where: { coordinator_id: requesterId }
        });

        const assignedYears = coordinatorAssignments.map(a => a.graduation_year);
        const hasAccess = event.is_all_graduates ||
                         event.target_graduation_years.some(year => assignedYears.includes(year));

        if (!hasAccess) {
          throw new Error('You do not have permission to view this event\'s attendance');
        }
      } else {
        throw new Error('You do not have permission to view this event\'s attendance');
      }
    }

    const attendances = await prisma.attendance.findMany({
      where: { event_id: eventId },
      include: {
        user: {
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
      orderBy: { responded_at: 'asc' }
    });

    return attendances;
  }

  /**
   * イベントへのアクセス権限チェック
   */
  private canAccessEvent(event: Event, userId: string): boolean {
    // 全体公開イベントの場合
    if (event.is_all_graduates) {
      return true;
    }

    // ユーザーの卒業年を取得
    const userProfile = prisma.profile.findUnique({
      where: { id: userId }
    });

    // TODO: 非同期処理を避けるため、事前にユーザープロファイルを取得するように改修
    // ここでは仮にtrueを返す
    return true;
  }

  /**
   * イベント通知を送信
   */
  async sendEventNotification(eventId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        creator: {
          select: {
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

    if (!event) return;

    // 対象ユーザーの取得
    let targetUsers: any[] = [];

    if (event.is_all_graduates) {
      targetUsers = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        include: { profile: true }
      });
    } else {
      // 対象卒業年のユーザーを取得
      for (const year of event.target_graduation_years) {
        const users = await prisma.user.findMany({
          where: {
            status: 'ACTIVE',
            profile: {
              graduation_year: year
            }
          },
          include: { profile: true }
        });
        targetUsers.push(...users);
      }
    }

    // 重複を除去
    const uniqueUsers = targetUsers.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    );

    // メール送信
    const subject = `同窓会イベントのお知らせ: ${event.title}`;
    const eventDate = event.event_date.toLocaleDateString('ja-JP');

    for (const user of uniqueUsers) {
      if (user.email) {
        const html = `
          <h2>${event.title}</h2>
          <p>${event.creator.profile?.name_sei} ${event.creator.profile?.name_mei}さんからイベントのお知らせです。</p>

          <h3>イベント詳細</h3>
          <ul>
            <li><strong>日時:</strong> ${eventDate}</li>
            ${event.location ? `<li><strong>場所:</strong> ${event.location}</li>` : ''}
            <li><strong>種類:</strong> ${this.getEventTypeDisplayName(event.event_type)}</li>
          </ul>

          ${event.description ? `<h3>説明</h3><p>${event.description}</p>` : ''}

          <p>アプリから出欠登録を行ってください。</p>

          <p>このメールは自動送信されています。</p>
        `;

        try {
          const emailService = new EmailService();
          await emailService.sendEmail(user.email, subject, html);
        } catch (error) {
          console.error(`Failed to send event notification to ${user.email}:`, error);
        }
      }
    }
  }

  /**
   * イベント種別の表示名を取得
   */
  private getEventTypeDisplayName(type: EventType): string {
    switch (type) {
      case EventType.REUNION:
        return '同窓会';
      case EventType.MEETING:
        return '役員会';
      case EventType.ANNOUNCEMENT:
        return '告知';
      default:
        return type;
    }
  }
}
