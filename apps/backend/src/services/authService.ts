import { prisma } from '../utils/prisma';
import { PasswordUtil } from '../utils/passwordUtil';
import { UUIDUtil } from '@reunion/shared';
import { JWTUtil } from '../utils/jwt';
import {
  UserRole,
  RegisterRequest,
  LoginRequest,
  AuthTokens,
  ConsentType
} from '@reunion/shared';
import { User, AccountStatus } from '@prisma/client';

export class AuthService {
  /**
   * ユーザー登録
   */
  static async register(registerData: RegisterRequest, ipAddress: string, userAgent: string): Promise<User> {
    const { name_sei, name_mei, email, password, graduation_year, student_number } = registerData;

    // パスワード強度チェック
    if (!PasswordUtil.isValidPassword(password)) {
      throw new Error('Password does not meet security requirements');
    }

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // パスワードハッシュ化
    const passwordHash = await PasswordUtil.hash(password);

    // デフォルトロールの取得
    const generalMemberRole = await prisma.role.findUnique({
      where: { name: UserRole.GENERAL_MEMBER }
    });

    if (!generalMemberRole) {
      throw new Error('Default role not found');
    }

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        id: UUIDUtil.generate(),
        email,
        password_hash: passwordHash,
        status: AccountStatus.PENDING,
        role_id: generalMemberRole.id,
      },
      include: {
        role: true,
        profile: true,
      }
    });

    // プロファイル作成
    await prisma.profile.create({
      data: {
        id: user.id,
        name_sei,
        name_mei,
        graduation_year,
        student_number,
      }
    });

    // 同意記録作成（仮定）
    await prisma.consentRecord.create({
      data: {
        id: UUIDUtil.generate(),
        user_id: user.id,
        consent_type: ConsentType.TERMS_OF_SERVICE,
        consent_version: '1.0',
        ip_address: ipAddress,
        user_agent: userAgent,
      }
    });

    return user;
  }

  /**
   * ログイン
   */
  static async login(loginData: LoginRequest, _ipAddress: string, _userAgent: string): Promise<AuthTokens & { user: User }> {
    const { email, password } = loginData;

    // ユーザーの取得
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        profile: true,
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // アカウントステータスチェック
    if (user.status === AccountStatus.SUSPENDED) {
      throw new Error('Account is suspended');
    }

    if (user.status === AccountStatus.DELETED) {
      throw new Error('Account is deleted');
    }

    if (user.status === AccountStatus.PENDING) {
      throw new Error('Account is pending approval');
    }

    // パスワード検証
    const isValidPassword = await PasswordUtil.verify(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // 最終ログイン更新
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() }
    });

    // JWTトークン生成
    const accessToken = JWTUtil.generateAccessToken({
      user_id: user.id,
      role: user.role.name as UserRole,
      email: user.email,
    });

    const refreshToken = JWTUtil.generateRefreshToken({
      user_id: user.id,
      email: user.email,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600, // 1 hour
      user,
    };
  }

  /**
   * トークンリフレッシュ
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // リフレッシュトークンの検証
    const decoded = JWTUtil.verifyRefreshToken(refreshToken);

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: decoded.user_id },
      include: { role: true }
    });

    if (!user || user.status !== AccountStatus.ACTIVE) {
      throw new Error('Invalid refresh token');
    }

    // 新しいトークン生成
    const accessToken = JWTUtil.generateAccessToken({
      user_id: user.id,
      role: user.role.name as UserRole,
      email: user.email,
    });

    const newRefreshToken = JWTUtil.generateRefreshToken({
      user_id: user.id,
      email: user.email,
    });

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: 3600,
    };
  }

  /**
   * パスワード変更
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // ユーザーの取得
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 現在のパスワード検証
    const isValidCurrentPassword = await PasswordUtil.verify(currentPassword, user.password_hash);
    if (!isValidCurrentPassword) {
      throw new Error('Current password is incorrect');
    }

    // 新しいパスワードの強度チェック
    if (!PasswordUtil.isValidPassword(newPassword)) {
      throw new Error('New password does not meet security requirements');
    }

    // パスワード更新
    const newPasswordHash = await PasswordUtil.hash(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: newPasswordHash }
    });
  }

  /**
   * パスワードリセットリクエスト
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // セキュリティのため、ユーザーが存在しない場合も成功として扱う
      return;
    }

    // TODO: パスワードリセットトークンの生成とメール送信
    // 実際の実装では、トークンを生成し、期限付きで保存し、メールを送信する
  }

  /**
   * ログアウト（トークン無効化）
   */
  static async logout(userId: string): Promise<void> {
    // 実際の実装では、トークンをブラックリストに登録したり、
    // セッションを無効化したりする処理を追加
    await prisma.user.update({
      where: { id: userId },
      data: { last_login_at: new Date() }
    });
  }

  /**
   * ユーザー取得（認証済み）
   */
  static async getAuthenticatedUser(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        profile: true,
      }
    });
  }
}
