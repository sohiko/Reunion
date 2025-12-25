import { Request, Response, NextFunction } from 'express';
import { JWTUtil, getTokenFromHeader, AuthorizationUtil } from '../utils/jwt';
import { AuthService } from '../services/authService';
import { UserRole, JWTPayload } from '@reunion/shared';

// リクエストオブジェクトの拡張
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userDetails?: any;
    }
  }
}

/**
 * JWT認証ミドルウェア
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getTokenFromHeader(req.headers.authorization) ||
                  req.cookies?.access_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // トークン検証
    const decoded = JWTUtil.verifyAccessToken(token);
    req.user = decoded;

    // ユーザーの詳細情報を取得（オプション）
    const userDetails = await AuthService.getAuthenticatedUser(decoded.user_id);
    if (userDetails) {
      req.userDetails = userDetails;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * オプション認証ミドルウェア（ログインしていない場合も許可）
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getTokenFromHeader(req.headers.authorization) ||
                  req.cookies?.access_token;

    if (token) {
      const decoded = JWTUtil.verifyAccessToken(token);
      req.user = decoded;

      const userDetails = await AuthService.getAuthenticatedUser(decoded.user_id);
      if (userDetails) {
        req.userDetails = userDetails;
      }
    }

    next();
  } catch (error) {
    // トークンが無効でもエラーを返さず、次の処理へ
    next();
  }
};

/**
 * ロールベース認可ミドルウェア
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!AuthorizationUtil.hasRole(req.user.role, allowedRoles)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * 管理者権限チェックミドルウェア
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!AuthorizationUtil.isAdmin(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required'
    });
  }

  next();
};

/**
 * 幹事以上権限チェックミドルウェア
 */
export const requireCoordinatorOrAbove = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!AuthorizationUtil.isCoordinatorOrAbove(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Coordinator or higher privileges required'
    });
  }

  next();
};

/**
 * リソース所有者チェックミドルウェア
 */
export const requireOwnership = (resourceUserIdField: string = 'user_id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    if (req.user.role !== UserRole.SYSTEM_ADMIN &&
        req.user.role !== UserRole.OFFICER &&
        req.user.user_id !== resourceUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: not the resource owner'
      });
    }

    next();
  };
};
