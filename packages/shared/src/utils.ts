import crypto from 'crypto';

// 暗号化ユーティリティ
export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  /**
   * AES-256-GCMで暗号化
   */
  static encrypt(text: string, key: string): string {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipher(this.ALGORITHM, keyBuffer);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex');
  }

  /**
   * AES-256-GCMで復号化
   */
  static decrypt(encryptedText: string, key: string): string {
    const keyBuffer = Buffer.from(key, 'hex');
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipher(this.ALGORITHM, keyBuffer);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.alloc(0));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 暗号化キーの生成
   */
  static generateKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
  }
}

// パスワードユーティリティ
export class PasswordUtil {
  private static readonly SALT_ROUNDS = 12;

  /**
   * パスワードハッシュ化
   */
  static async hash(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * パスワード検証
   */
  static async verify(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hash);
  }
}

// UUID生成ユーティリティ
export class UUIDUtil {
  /**
   * UUID v4生成
   */
  static generate(): string {
    return crypto.randomUUID();
  }
}

// バリデーションユーティリティ
export class ValidationUtil {
  /**
   * メールアドレス形式チェック
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * パスワード強度チェック
   */
  static isValidPassword(password: string): boolean {
    // 最低12文字、大文字小文字数字記号の混合
    const minLength = password.length >= 12;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  }

  /**
   * ファイル拡張子チェック
   */
  static isValidImageExtension(filename: string): boolean {
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return allowedExtensions.includes(ext);
  }

  /**
   * ファイルサイズチェック（5MB以下）
   */
  static isValidFileSize(sizeInBytes: number): boolean {
    const maxSize = 5 * 1024 * 1024; // 5MB
    return sizeInBytes <= maxSize;
  }
}

// 日付ユーティリティ
export class DateUtil {
  /**
   * 日本時間での現在時刻取得
   */
  static now(): Date {
    return new Date();
  }

  /**
   * 日本時間での日付文字列取得
   */
  static formatJST(date: Date): string {
    return date.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * 指定年後の日付計算
   */
  static addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  /**
   * 指定日後の日付計算
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}

// 権限チェックユーティリティ
export class PermissionUtil {
  /**
   * ロールベースの権限チェック
   */
  static hasPermission(userRole: string, requiredRoles: string[]): boolean {
    return requiredRoles.includes(userRole);
  }

  /**
   * 担当学年チェック
   */
  static isAssignedCoordinator(coordinatorAssignments: any[], userId: string, graduationYear: number): boolean {
    return coordinatorAssignments.some(
      assignment => assignment.coordinator_id === userId && assignment.graduation_year === graduationYear
    );
  }
}
