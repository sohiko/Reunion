import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole, JWTPayload } from '@reunion/shared';

export class JWTUtil {
  /**
   * JWTアクセストークンの生成
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, config.jwt.secretKey, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * JWTリフレッシュトークンの生成
   */
  static generateRefreshToken(payload: { user_id: string; email: string }): string {
    return jwt.sign(payload, config.jwt.refreshSecretKey, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }

  /**
   * JWTアクセストークンの検証
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secretKey) as JWTPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  /**
   * JWTリフレッシュトークンの検証
   */
  static verifyRefreshToken(token: string): { user_id: string; email: string } {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecretKey) as { user_id: string; email: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * トークンの有効期限チェック
   */
  static isTokenExpired(token: string): boolean {
    try {
      jwt.verify(token, config.jwt.secretKey);
      return false;
    } catch (error) {
      return true;
    }
  }
}

// ミドルウェア用ヘルパー
export function getTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// 認可チェックユーティリティ
export class AuthorizationUtil {
  /**
   * ロールベースの権限チェック
   */
  static hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    return requiredRoles.includes(userRole);
  }

  /**
   * 管理者権限チェック
   */
  static isAdmin(userRole: UserRole): boolean {
    return userRole === UserRole.SYSTEM_ADMIN || userRole === UserRole.OFFICER;
  }

  /**
   * 幹事以上権限チェック
   */
  static isCoordinatorOrAbove(userRole: UserRole): boolean {
    return [UserRole.SYSTEM_ADMIN, UserRole.OFFICER, UserRole.COORDINATOR].includes(userRole);
  }

  /**
   * 一般会員権限チェック
   */
  static isGeneralMember(userRole: UserRole): boolean {
    return userRole === UserRole.GENERAL_MEMBER;
  }

  /**
   * 特定のロールが必要な操作のチェック
   */
  static requireRoles(userRole: UserRole, allowedRoles: UserRole[]): void {
    if (!this.hasRole(userRole, allowedRoles)) {
      throw new Error(`Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`);
    }
  }
}
