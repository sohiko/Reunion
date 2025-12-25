import twilio from 'twilio';
import { config } from '../config';

export interface SMSOptions {
  to: string;
  body: string;
  from?: string;
}

export class SMSService {
  private client: twilio.Twilio | null = null;

  constructor() {
    if (config.sms.twilioAccountSid && config.sms.twilioAuthToken) {
      this.client = twilio(config.sms.twilioAccountSid, config.sms.twilioAuthToken);
    }
  }

  /**
   * SMSを送信
   */
  async sendSMS(options: SMSOptions): Promise<boolean> {
    if (!this.client) {
      console.warn('Twilio not configured, SMS not sent');
      return false;
    }

    try {
      await this.client.messages.create({
        body: options.body,
        from: options.from || config.sms.twilioPhoneNumber,
        to: options.to,
      });

      return true;
    } catch (error) {
      console.error('SMS send failed:', error);
      return false;
    }
  }

  /**
   * バルクSMSを送信
   */
  async sendBulkSMS(messages: SMSOptions[]): Promise<{ success: number; failed: number }> {
    if (!this.client) {
      console.warn('Twilio not configured, bulk SMS not sent');
      return { success: 0, failed: messages.length };
    }

    let success = 0;
    let failed = 0;

    for (const message of messages) {
      try {
        await this.sendSMS(message);
        success++;
      } catch (error) {
        console.error(`Failed to send SMS to ${message.to}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * 緊急連絡SMSを送信
   */
  async sendEmergencySMS(phoneNumber: string, message: string): Promise<boolean> {
    return this.sendSMS({
      to: phoneNumber,
      body: `[緊急] 同窓会アプリ: ${message}`,
    });
  }

  /**
   * イベントリマインダーSMSを送信
   */
  async sendEventReminder(phoneNumber: string, eventTitle: string, eventDate: string): Promise<boolean> {
    const message = `同窓会イベント「${eventTitle}」のリマインダーです。日時: ${eventDate}`;
    return this.sendSMS({
      to: phoneNumber,
      body: message,
    });
  }

  /**
   * SMSサービスの健全性チェック
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // アカウント情報を取得して接続を確認
      await this.client.api.accounts(config.sms.twilioAccountSid).fetch();
      return true;
    } catch (error) {
      console.error('SMS service health check failed:', error);
      return false;
    }
  }
}
