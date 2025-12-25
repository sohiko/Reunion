import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { LoginRequest, RegisterRequest, ApiResponse } from '@reunion/shared';

export class AuthController {
  /**
   * ユーザー登録
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const registerData: RegisterRequest = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const user = await AuthService.register(registerData, ipAddress, userAgent);

      const response: ApiResponse = {
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            status: user.status,
            role: (user as any).role.name,
          }
        }
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
      res.status(400).json(response);
    }
  }

  /**
   * ログイン
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const result = await AuthService.login(loginData, ipAddress, userAgent);

      // HTTPOnly Cookieにトークンを設定
      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000, // 1 hour
      });

      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 3600000, // 7 days
      });

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            status: result.user.status,
            role: (result.user as any).role.name,
            profile: (result.user as any).profile ? {
              name_sei: (result.user as any).profile.name_sei,
              name_mei: (result.user as any).profile.name_mei,
              graduation_year: (result.user as any).profile.graduation_year,
            } : undefined,
          },
          expires_in: result.expires_in,
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
      res.status(401).json(response);
    }
  }

  /**
   * トークンリフレッシュ
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        const response: ApiResponse = {
          success: false,
          error: 'Refresh token required'
        };
        res.status(400).json(response);
      }

      const result = await AuthService.refreshToken(refresh_token);

      // 新しいトークンをCookieに設定
      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000,
      });

      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 3600000,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          expires_in: result.expires_in,
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };
      res.status(401).json(response);
    }
  }

  /**
   * パスワード変更
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user!.user_id;

      if (!current_password || !new_password) {
        const response: ApiResponse = {
          success: false,
          error: 'Current password and new password are required'
        };
        res.status(400).json(response);
      }

      await AuthService.changePassword(userId, current_password, new_password);

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully'
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed'
      };
      res.status(400).json(response);
    }
  }

  /**
   * パスワードリセットリクエスト
   */
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        const response: ApiResponse = {
          success: false,
          error: 'Email is required'
        };
        res.status(400).json(response);
      }

      await AuthService.requestPasswordReset(email);

      const response: ApiResponse = {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset request failed'
      };
      res.status(400).json(response);
    }
  }

  /**
   * ログアウト
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.user_id;

      if (userId) {
        await AuthService.logout(userId);
      }

      // Cookieをクリア
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully'
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 現在のユーザー情報取得
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.user_id;
      const user = await AuthService.getAuthenticatedUser(userId);

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            status: user.status,
            role: (user as any).role.name,
            profile: (user as any).profile ? {
              name_sei: (user as any).profile.name_sei,
              name_mei: (user as any).profile.name_mei,
              graduation_year: (user as any).profile.graduation_year,
              student_number: (user as any).profile.student_number,
            } : undefined,
          }
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user information'
      };
      res.status(500).json(response);
    }
  }
}
