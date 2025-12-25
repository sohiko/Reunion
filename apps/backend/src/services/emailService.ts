import nodemailer from 'nodemailer';
import { config } from '../config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fallbackTransporter: nodemailer.Transporter | null = null;

  constructor() {
    // プライマリ（SendGrid）
    if (config.email.sendgridApiKey) {
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: config.email.sendgridApiKey,
        },
      });
    }
    // フォールバック（Mailgun）
    else if (config.email.mailgunApiKey) {
      this.fallbackTransporter = nodemailer.createTransporter({
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: {
          user: `postmaster@${config.email.mailgunApiKey.split('@')[1]}`,
          pass: config.email.mailgunApiKey,
        },
      });
      this.transporter = this.fallbackTransporter;
    }
    // 最終フォールバック（Gmail SMTP）
    else {
      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
    }
  }

  /**
   * メールを送信
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: options.from || config.email.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (primaryError) {
      console.error('Primary email service failed:', primaryError);

      // プライマリが失敗した場合、フォールバックを試行
      if (this.fallbackTransporter && this.fallbackTransporter !== this.transporter) {
        try {
          const mailOptions = {
            from: options.from || config.email.fromEmail,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
          };

          await this.fallbackTransporter.sendMail(mailOptions);
          return true;
        } catch (fallbackError) {
          console.error('Fallback email service also failed:', fallbackError);
        }
      }

      return false;
    }
  }

  /**
   * バルクメールを送信（レート制限に注意）
   */
  async sendBulkEmails(emails: EmailOptions[], batchSize: number = 10): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // バッチ処理で送信
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const promises = batch.map(email => this.sendEmail(email));
      const results = await Promise.all(promises);

      success += results.filter(result => result).length;
      failed += results.filter(result => !result).length;

      // レート制限を避けるための遅延
      if (i + batchSize < emails.length) {
        await this.delay(1000); // 1秒待機
      }
    }

    return { success, failed };
  }

  /**
   * HTMLメールテンプレートを生成
   */
  static generateHtmlTemplate(title: string, content: string, footer?: string): string {
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #0073e6;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 5px 5px;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .button {
            display: inline-block;
            background-color: #0073e6;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>同窓会アプリ</h1>
        </div>
        <div class="content">
          <h2>${title}</h2>
          ${content}
        </div>
        ${footer ? `<div class="footer">${footer}</div>` : ''}
      </body>
      </html>
    `;
  }

  /**
   * ユーザー登録確認メールを送信
   */
  async sendRegistrationConfirmation(email: string, confirmationUrl: string): Promise<boolean> {
    const subject = '同窓会アプリ：メールアドレス確認のお願い';
    const html = EmailService.generateHtmlTemplate(
      'メールアドレス確認',
      `
        <p>同窓会アプリに登録いただき、ありがとうございます。</p>
        <p>以下のリンクをクリックして、メールアドレスを確認してください：</p>
        <p><a href="${confirmationUrl}" class="button">メールアドレスを確認する</a></p>
        <p>このリンクは24時間で有効期限が切れます。</p>
      `,
      'このメールは自動送信されています。ご質問がある場合は、アプリ内からお問い合わせください。'
    );

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * パスワードリセットメールを送信
   */
  async sendPasswordReset(email: string, resetUrl: string): Promise<boolean> {
    const subject = '同窓会アプリ：パスワードリセット';
    const html = EmailService.generateHtmlTemplate(
      'パスワードリセット',
      `
        <p>パスワードリセットのリクエストを受け付けました。</p>
        <p>以下のリンクをクリックして、新しいパスワードを設定してください：</p>
        <p><a href="${resetUrl}" class="button">パスワードをリセットする</a></p>
        <p>このリンクは1時間で有効期限が切れます。</p>
        <p>リクエストしていない場合は、このメールを無視してください。</p>
      `,
      'このメールは自動送信されています。'
    );

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * アカウント承認通知を送信
   */
  async sendAccountApprovalNotification(email: string): Promise<boolean> {
    const subject = '同窓会アプリ：アカウントが承認されました';
    const html = EmailService.generateHtmlTemplate(
      'アカウント承認のお知らせ',
      `
        <p>ご登録いただいたアカウントが承認されました。</p>
        <p>以下のリンクからログインして、アプリをご利用いただけます：</p>
        <p><a href="${config.app.frontendUrl}/login" class="button">ログインする</a></p>
      `,
      'このメールは自動送信されています。'
    );

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * 連絡先アクセス申請通知を送信
   */
  async sendContactAccessRequestNotification(
    email: string,
    requesterName: string,
    requestUrl: string
  ): Promise<boolean> {
    const subject = '同窓会アプリ：連絡先開示許可申請のお知らせ';
    const html = EmailService.generateHtmlTemplate(
      '連絡先開示許可申請',
      `
        <p>${requesterName}さんから、連絡先情報の開示許可を申請されました。</p>
        <p>以下のリンクから承認・拒否を行ってください：</p>
        <p><a href="${requestUrl}" class="button">リクエストを確認する</a></p>
      `,
      'このメールは自動送信されています。'
    );

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * イベント通知を送信
   */
  async sendEventNotification(
    email: string,
    eventTitle: string,
    eventDate: string,
    eventDetails: string,
    registrationUrl?: string
  ): Promise<boolean> {
    const subject = `同窓会アプリ：イベントのお知らせ - ${eventTitle}`;
    const html = EmailService.generateHtmlTemplate(
      'イベントのお知らせ',
      `
        <h3>${eventTitle}</h3>
        <p><strong>日時:</strong> ${eventDate}</p>
        ${eventDetails}
        ${registrationUrl ? `<p><a href="${registrationUrl}" class="button">出欠登録をする</a></p>` : ''}
      `,
      'このメールは自動送信されています。'
    );

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * メールサービスの健全性チェック
   */
  async healthCheck(): Promise<boolean> {
    try {
      // テストメール送信（実際には送信せず検証のみ）
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service health check failed:', error);
      return false;
    }
  }
}
