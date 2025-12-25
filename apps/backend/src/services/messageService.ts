import { prisma } from '../utils/prisma';
import { UUIDUtil } from '@reunion/shared';
import {
  UserRole
} from '@reunion/shared';
import { Message, MessageType } from '@prisma/client';

export interface CreateMessageData {
  recipient_id: string;
  conversation_id?: string;
  content: string;
  message_type?: MessageType;
}

export class MessageService {
  /**
   * メッセージを送信
   */
  async sendMessage(senderId: string, messageData: CreateMessageData): Promise<Message> {
    const { recipient_id, conversation_id, content, message_type = MessageType.INDIVIDUAL } = messageData;

    // 受信者の存在確認
    const recipient = await prisma.user.findUnique({
      where: { id: recipient_id },
      include: { role: true }
    });

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // 送信者の存在確認
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { role: true }
    });

    if (!sender) {
      throw new Error('Sender not found');
    }

    // 権限チェック
    if (!this.canSendMessage(sender, recipient, message_type)) {
      throw new Error('You do not have permission to send this type of message');
    }

    // 会話IDの生成（新規会話の場合）
    let finalConversationId = conversation_id;
    if (!finalConversationId) {
      finalConversationId = UUIDUtil.generate();
    }

    const message = await prisma.message.create({
      data: {
        id: UUIDUtil.generate(),
        sender_id: senderId,
        recipient_id,
        conversation_id: finalConversationId,
        content,
        message_type,
        is_read: false,
      }
    });

    return message;
  }

  /**
   * 一斉メッセージを送信
   */
  async sendBulkMessage(
    senderId: string,
    targetIds: string[],
    content: string,
    messageType: MessageType = MessageType.ANNOUNCEMENT
  ): Promise<Message[]> {
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { role: true, coordinatorAssignments: true }
    });

    if (!sender) {
      throw new Error('Sender not found');
    }

    // 権限チェック
    if (!this.canSendBulkMessage(sender, messageType)) {
      throw new Error('You do not have permission to send bulk messages');
    }

    const conversationId = UUIDUtil.generate();
    const messages: Message[] = [];

    for (const targetId of targetIds) {
      // 送信権限の再チェック（受信者ごとに）
      const recipient = await prisma.user.findUnique({
        where: { id: targetId },
        include: { profile: true }
      });

      if (!recipient) continue;

      if (!this.canSendToRecipient(sender, recipient, messageType)) {
        continue;
      }

      const message = await prisma.message.create({
        data: {
          id: UUIDUtil.generate(),
          sender_id: senderId,
          recipient_id: targetId,
          conversation_id: conversationId,
          content,
          message_type: messageType,
          is_read: false,
        }
      });

      messages.push(message);
    }

    return messages;
  }

  /**
   * メッセージを取得
   */
  async getMessage(messageId: string, userId: string): Promise<Message | null> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            profile: {
              select: {
                name_sei: true,
                name_mei: true,
              }
            }
          }
        },
        recipient: {
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

    if (!message) return null;

    // 送信者または受信者のみアクセス可能
    if (message.sender_id !== userId && message.recipient_id !== userId) {
      return null;
    }

    return message;
  }

  /**
   * 会話のメッセージ一覧を取得
   */
  async getConversationMessages(conversationId: string, userId: string): Promise<Message[]> {
    // ユーザーがこの会話に参加しているかチェック
    const participantCheck = await prisma.message.findFirst({
      where: {
        conversation_id: conversationId,
        OR: [
          { sender_id: userId },
          { recipient_id: userId }
        ]
      }
    });

    if (!participantCheck) {
      throw new Error('You do not have access to this conversation');
    }

    const messages = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      include: {
        sender: {
          select: {
            id: true,
            profile: {
              select: {
                name_sei: true,
                name_mei: true,
              }
            }
          }
        },
        recipient: {
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
      orderBy: { created_at: 'asc' }
    });

    return messages;
  }

  /**
   * 受信メッセージ一覧を取得
   */
  async getReceivedMessages(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ messages: Message[]; total: number; totalPages: number }> {
    const where = {
      recipient_id: userId,
      recipient_deleted_at: null,
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
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
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where })
    ]);

    return {
      messages,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 送信メッセージ一覧を取得
   */
  async getSentMessages(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ messages: Message[]; total: number; totalPages: number }> {
    const where = {
      sender_id: userId,
      sender_deleted_at: null,
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          recipient: {
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
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where })
    ]);

    return {
      messages,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * メッセージを既読にする
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.recipient_id !== userId) {
      throw new Error('You can only mark your own messages as read');
    }

    if (!message.is_read) {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          is_read: true,
          read_at: new Date(),
        }
      });
    }
  }

  /**
   * メッセージを削除（論理削除）
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender_id !== userId && message.recipient_id !== userId) {
      throw new Error('You do not have permission to delete this message');
    }

    const updateData: any = {};
    if (message.sender_id === userId) {
      updateData.sender_deleted_at = new Date();
    }
    if (message.recipient_id === userId) {
      updateData.recipient_deleted_at = new Date();
    }

    // 両方が削除した場合のみ物理削除
    if (message.sender_deleted_at || message.recipient_deleted_at) {
      await prisma.message.delete({
        where: { id: messageId }
      });
    } else {
      await prisma.message.update({
        where: { id: messageId },
        data: updateData
      });
    }
  }

  /**
   * 未読メッセージ数をカウント
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.message.count({
      where: {
        recipient_id: userId,
        is_read: false,
        recipient_deleted_at: null,
      }
    });
  }

  /**
   * メッセージ送信権限チェック
   */
  private canSendMessage(sender: any, recipient: any, messageType: MessageType): boolean {
    // 個別メッセージの場合、基本的に誰にでも送信可能
    if (messageType === MessageType.INDIVIDUAL) {
      return true;
    }

    // グループメッセージ・一斉メッセージの場合、権限が必要
    if (messageType === MessageType.GROUP || messageType === MessageType.ANNOUNCEMENT) {
      return sender.role.name === UserRole.COORDINATOR ||
             sender.role.name === UserRole.OFFICER ||
             sender.role.name === UserRole.TEACHER ||
             sender.role.name === UserRole.SYSTEM_ADMIN;
    }

    return false;
  }

  /**
   * 一斉メッセージ送信権限チェック
   */
  private canSendBulkMessage(sender: any, messageType: MessageType): boolean {
    if (messageType === MessageType.ANNOUNCEMENT) {
      return sender.role.name === UserRole.COORDINATOR ||
             sender.role.name === UserRole.OFFICER ||
             sender.role.name === UserRole.TEACHER ||
             sender.role.name === UserRole.SYSTEM_ADMIN;
    }

    return false;
  }

  /**
   * 受信者への送信権限チェック
   */
  private canSendToRecipient(sender: any, recipient: any, messageType: MessageType): boolean {
    // 個別メッセージの場合
    if (messageType === MessageType.INDIVIDUAL) {
      return true;
    }

    // 幹事の場合、担当学年のみ
    if (sender.role.name === UserRole.COORDINATOR) {
      const assignedYears = (sender as any).coordinatorAssignments.map((a: any) => a.graduation_year);
      return assignedYears.includes(recipient.profile?.graduation_year);
    }

    // 教員の場合、各学年への送信が可能
    if (sender.role.name === UserRole.TEACHER) {
      return true;
    }

    // 役員・システム管理者の場合、全員に送信可能
    if (sender.role.name === UserRole.OFFICER || sender.role.name === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    return false;
  }

  /**
   * 対象ユーザー一覧を取得（一斉送信用）
   */
  async getTargetUsersForBulkMessage(
    senderId: string,
    targetGraduationYears?: number[],
    isAllGraduates: boolean = false
  ): Promise<string[]> {
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { role: true, coordinatorAssignments: true }
    });

    if (!sender) {
      throw new Error('Sender not found');
    }

    const where: any = {
      status: 'ACTIVE',
    };

    // 幹事の場合、担当学年のみ
    if (sender.role.name === UserRole.COORDINATOR) {
      const assignedYears = (sender as any).coordinatorAssignments.map((a: any) => a.graduation_year);
      where.profile = {
        graduation_year: {
          in: assignedYears
        }
      };
    }
    // 指定された卒業年の場合
    else if (targetGraduationYears && targetGraduationYears.length > 0) {
      where.profile = {
        graduation_year: {
          in: targetGraduationYears
        }
      };
    }
    // 全体送信の場合
    else if (isAllGraduates) {
      // 条件なし
    }
    // デフォルトは送信不可
    else {
      return [];
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true }
    });

    return users.map((u: any) => u.id);
  }
}
