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

  /**
   * パスワード強度チェック
   */
  static isValidPassword(password: string): boolean {
    // 最低12文字、大文字小文字数字記号の混合
    const minLength = password.length >= 12;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?/]/.test(password);

    return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  }
}
